function trackTransactionResponse(req, res, context, ee, next) {
    const status = Number(res.statusCode);

    if (status === 201) {
        ee.emit('counter', 'transactions_success', 1);
    } else if (status === 409) {
        ee.emit('counter', 'transactions_conflict_or_rejected', 1);
    } else {
        ee.emit('counter', 'transactions_unexpected_status', 1);
    }

    next();
}

module.exports = {
    trackTransactionResponse,
};
