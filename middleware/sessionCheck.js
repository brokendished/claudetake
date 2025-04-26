module.exports = function sessionCheck(req, res, next) {
    if (req.session && req.session.user) {
        // Session exists, proceed to the next middleware or route
        return next();
    } else {
        // No valid session, redirect to login or send an error
        return res.status(401).json({ message: 'Unauthorized: No active session' });
    }
};
