/**
 * sessionAuth
 *
 * @module      :: Policy
 * @description :: Simple policy to allow any authenticated user
 *                 Assumes that your login action in one of your controllers sets `req.session.authenticated = true;`
 * @docs        :: http://sailsjs.org/#!documentation/policies
 *
 */
module.exports = function(req, res, next) {
  // User is allowed, proceed to the next policy,
  // or if this is the last policy, the controller
  if(req.session.passport.user) {
    User.findOne({id: req.session.passport.user}).exec(function(err, user){
      if(user.isAdmin) return next();
      else return res.forbidden('You are not permitted to perform this action.');
    })
  }

};
