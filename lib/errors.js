"use strict";

function NotLoggedInError(path) {
  this.name = "NotLoggedInError";
  this.message = "You need to login to perform this action.";
  this.path = path;
  this.status = 401;
  this.expose = true;
}
NotLoggedInError.prototype = Error.prototype;
exports.NotLoggedInError = NotLoggedInError;


function NotAuthorizedError(redirect) {
  this.name = "NotAuthorizedError";
  this.message = "You are not authorized to perform this action.";
  if (redirect)  this.redirect = redirect;
  this.status = 401;
  this.expose = true;
}
NotAuthorizedError.prototype = Error.prototype;
exports.NotAuthorizedError = NotAuthorizedError;

function SystemAccountError(message) {
  this.name = "SystemAccountError";
  this.message = message || "You are not allowed to change system accounts.";
  this.status = 401;
  this.expose = true;
}
SystemAccountError.prototype = Error.prototype;
exports.SystemAccountError = SystemAccountError;


function APISecuredError(message) {
  this.name = "APISecuredError";
  this.message = (message || "This API endpoint has been secured.");
  this.status = 401;
  this.expose = true;
}
APISecuredError.prototype = Error.prototype;
exports.APISecuredError = APISecuredError;

function InvalidMethodError(message) {
  this.name = "InvalidMethodError";
  this.message = (message || "Invalid HTTP method attempted.");
  this.status = 405;
  this.expose = true;
}
InvalidMethodError.prototype = Error.prototype;
exports.InvalidMethodError = InvalidMethodError;


function NotFoundError(message) {
  this.name = "NotFoundError";
  this.message = (message || "This resource was not found.");
  this.status = 404;
  this.expose = true;
}
NotFoundError.prototype = Error.prototype;
exports.NotFoundError = NotFoundError;


function MissingParametersError(params) {
  this.name = "MissingParametersError";
  this.message = "You are missing parameters: " + ([].concat(params, []).join(', '));
  this.status = 406;
  this.data = params;
  this.expose = true;
}
MissingParametersError.prototype = Error.prototype;
exports.MissingParametersError = MissingParametersError;

function SecurityDocRequiredError(message) {
  this.name = "SecurityDocRequiredError";
  this.message = ("You have not supplied the required security doc." || message);
  this.status = 401;
  this.expose = true;
}
SecurityDocRequiredError.prototype = Error.prototype;
exports.SecurityDocRequiredError = SecurityDocRequiredError;


function ValidationError(validation) {
  this.name = "ValidationError";
  this.message = "Validation failed.";
  this.status = 400;
  this.data = validation;
  this.expose = true;
}
ValidationError.prototype = Error.prototype;
exports.ValidationError = ValidationError;
