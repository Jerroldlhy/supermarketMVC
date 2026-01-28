const { getAccessToken } = require('./paypal');

const addTrackingBatch = async (payload) => {
    const accessToken = await getAccessToken();
    if (typeof fetch !== 'function') {
        throw new Error('Global fetch is not available.');
    }

    const response = await fetch(`${process.env.PAYPAL_API}/v1/shipping/trackers-batch`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    return { status: response.status, data };
};

module.exports = {
    addTrackingBatch
};
