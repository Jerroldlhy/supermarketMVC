const getCourseInitId = () => {
    try {
        require.resolve('../course_init_id');
        const { courseInitId } = require('../course_init_id');
        return courseInitId ? String(courseInitId) : '';
    } catch (error) {
        return '';
    }
};

const PaymentAttempt = require('../models/paymentAttempt');
const fraudService = require('./fraud');
const { DEFAULT_CURRENCY, normaliseCurrency } = require('./currency');

const isMobileAgent = (req) => {
    const ua = String(req.headers['user-agent'] || '').toLowerCase();
    return /android|iphone|ipad|mobile/.test(ua);
};

exports.generateQrCode = async (req, res) => {
    const { cartTotal } = req.body;

    try {
        if (typeof fetch !== 'function') {
            throw new Error('Global fetch is not available.');
        }

        const fraudCheck = await new Promise((resolve, reject) => {
            fraudService.assessPaymentAttempt(req, req.session.user.id, { amount: cartTotal }, (err, result) => {
                if (err) {
                    return reject(err);
                }
                return resolve(result);
            });
        });

        if (fraudCheck.action === 'block') {
            return res.status(429).render('netsTxnFailStatus', {
                title: 'Transaction Blocked',
                message: 'Payment blocked due to risk checks.',
                amount: cartTotal
            });
        }

        req.session.netsLastAmount = cartTotal;
        const currency = normaliseCurrency(req.session.currency || DEFAULT_CURRENCY);
        const requestBody = {
            txn_id: 'sandbox_nets|m|8ff8e5b6-d43e-4786-8ac5-7accf8c5bd9b',
            amt_in_dollars: cartTotal,
            notify_mobile: isMobileAgent(req) ? 1 : 0
        };

        const response = await fetch(
            'https://sandbox.nets.openapipaas.com/api/v1/common/payments/nets-qr/request',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': process.env.API_KEY,
                    'project-id': process.env.PROJECT_ID
                },
                body: JSON.stringify(requestBody)
            }
        );

        const data = await response.json();
        const qrData = data && data.result ? data.result.data : null;

        if (qrData && qrData.response_code === '00' && qrData.txn_status === 1 && qrData.qr_code) {
            const txnRetrievalRef = qrData.txn_retrieval_ref;
            const courseInitId = getCourseInitId();
            req.session.netsTxnRetrievalRef = txnRetrievalRef;
            req.session.netsActive = true;

            PaymentAttempt.create({
                userId: req.session.user.id,
                orderId: req.session.pendingOrderId || null,
                provider: 'nets',
                method: 'nets',
                status: 'INITIATED',
                amount: cartTotal,
                currency,
                ipAddress: fraudCheck.ipAddress,
                providerOrderId: txnRetrievalRef
            }, () => {});

            const webhookUrl = `https://sandbox.nets.openapipaas.com/api/v1/common/payments/nets/webhook?txn_retrieval_ref=${txnRetrievalRef}&course_init_id=${courseInitId}`;

            return res.render('netsQr', {
                title: 'Scan to Pay',
                total: cartTotal,
                currency,
                qrCodeUrl: `data:image/png;base64,${qrData.qr_code}`,
                txnRetrievalRef,
                courseInitId,
                webhookUrl,
                fullNetsResponse: data,
                apiKey: process.env.API_KEY,
                projectId: process.env.PROJECT_ID
            });
        }

        const errorMsg = qrData && qrData.error_message
            ? qrData.error_message
            : 'An error occurred while generating the QR code.';

        return res.render('netsTxnFailStatus', {
            title: 'Transaction Failed',
            message: errorMsg,
            amount: cartTotal
        });
    } catch (error) {
        console.error('Error in generateQrCode:', error.message);
        return res.redirect('/nets-qr/fail');
    }
};
