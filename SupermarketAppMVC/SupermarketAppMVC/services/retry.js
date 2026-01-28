const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withRetries = async (fn, options) => {
    const { retries = 2, baseDelayMs = 300 } = options || {};
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
            return await fn(attempt);
        } catch (error) {
            lastError = error;
            if (attempt < retries) {
                const delayMs = baseDelayMs * Math.pow(2, attempt);
                await delay(delayMs);
            }
        }
    }

    throw lastError;
};

module.exports = {
    withRetries
};
