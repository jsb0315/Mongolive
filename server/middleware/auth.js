const jwt = require('jsonwebtoken');

// Middleware for authenticating users
const auth = (req, res, next) => {
  // Get the token from the request headers
  const token = req.header('Authorization')?.replace('Bearer ', '');

  // If no token is provided, return an unauthorized response
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    // Verify the token using the secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach the decoded user information to the request object
    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    // If token verification fails, return an unauthorized response
    res.status(400).json({ message: 'Invalid token.' });
  }
};

module.exports = auth;