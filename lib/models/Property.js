"use strict";

var ObjectID = require('mongodb').ObjectID;
var DBRef = require('mongodb').DBRef;
var Validators = require('../validators');

/**
 * Defines a property that a Structure or Document can have
 */
class Property {
  constructor(def, name) {
    if (!def.type) {
      console.error(`${name} definition failed.`);
      console.error(def);
      throw new Error('Type is required for Property definition');
    }

    this._type = def.type;
    this._hydrate = def.hydrate ? true : false;
    this._array = def.array ? true : false;
    this._validators = def.validators || {};
    this._secure = def.secure || null;
    this._name = name;
  }


  /**
   * Validates one property of this model and returns the Validation Result
   * @param doc the object to validate
   * @param property a string of the property name to validate
   * @param method create, update or patch
   * @returns {*} a Validation Result object
   */
  validate(doc, method) {
    var self = this;

    //We will start by assuming this is valid.  If any one fails, this will be false.
    var valid = true;

    function _validate(val) {
      var result = {};

      for (var name in self.validators) {
        //Handled previously
        if (name === 'Required') {
          continue;
        }

        //This is a special validator just for Arrays, skip it here
        if (name.indexOf('Array') === 0) {
          continue;
        }

        var validator = Validators[name];

        //If the validatorName does not match a registered function in Validators, it is either a custom function
        //or a string representing a custom function that has not been compiled yet.
        if (!validator) {
          //This is a custom function definition.
          if (typeof(self.validators[name]) === 'function') {
            result = self.validators[name](val, doc, self.name);
          } else if (typeof(self.validators[name]) === 'string') {
            //Compile the function.
            //TODO: compile the validator function.
          } else {
            throw new Error(`Property ${self.name} has invalid validator ${name}.`);
          }
        } else {
          //Run the validator, passing in the value set in the property definition.
          result = validator(val, self.validators[name]);
        }


        if (result[name] === false) {
          valid = false;
        }
      }


      return result;
    }

    //Early exit. No validators? Then this field is valid by default.
    if (!this.validators) {
      return true;
    }

    var result = {};

    //Required is a special validator.
    //If a field is not required, it can be null and therefore passes validation, since null is valid.
    //Also, if the method is an Patch update, a field is not required for patch updates, because the required
    //field may already be set in the databse, so null is valid.
    if (this.validators.Required && (method === 'create' || method === 'update')) {
      result.Required = Validators.Required(doc[this.name]);

      //If there is no value in this field (ie. Required failed). then exit early. No need to run other validators.
      if (!result.Required) {
        return result;
      }
    } else {
      //If there is no Required validator set. Then we are going to use this Validator to check if a value is set.
      //If there is no value set, we can't run the rest of the validators (because there is no value).
      //However, this field is valid, because if it is not required a non-value is valid.

      //If this is a Patch update.  Then even though the field may be Required, it is not required at this moment
      if (!Validators.Required(doc[this.name])) {
        return true;
      }
    }

    //If this property is an array, we need to run validators on each of the array. And also run special array
    //validators on the array itself.
    if (this.isArray) {
      result = [];

      for (var name in this.validators) {
        if (!Validators[name]) {
          throw new Error(`Invalid Validator on ${this.name}:${name}`);
        }

        //This is a special validator just for Arrays, run it here
        result[name] = Validators[name](doc[this.name], this.validators[name]);

        if (result[name] !== true) {
          valid = false;
        }
      }

      for (let i = 0; i < doc[this.name].length; i++) {
        result[i] = _validate(method, doc[this.name][i]);
      }
    } else {
      result = _validate(method, doc[this.name])
    }

    //We don't care about the specific validation results if the property is valid.
    return valid ? true : result;
  }

  /**
   * Casts an value being set to the Type as defined by the property definition.
   * @param property
   * @param value
   * @returns {*}
   */
  cast (value, obj) {
    function subcast(value, obj) {
      //If the value being set is already in the type we expect, just set it
      if (value !== undefined && value !== null && value.constructor !== this._type) {
        //Determine what the type of this property is, it will determine how it is initialized
        if (this._type === String || this._type === Number) {
          return value;
        } else if (this._type === Date && value.constructor.name === 'Moment') {
          //TODO: not sure if name check will work will minified
          //Some extra logic here, lets deal with MomentJS and other date libs.
          return value;
        } else if (this.isSubDocument) {
          //A sub-document may be a parent Model that other Models have extended.
          if (value && value.__data && value.__data._type) {
            //This model is already instantinated correctly.
            if (value.__data._type === value.constructor.cls) {
              return value;
            }
          } else if (value && value._type && value._type !== this._type.cls) {
            //It has not been instantinated, but Model info was provided.
            return new this._type.children[value._type](value, obj.__locale);
          } else {
            //All subdocs inherit the same locale.  OR, another way to say.  A document has the same locale all the way down
            return new this._type(value, obj.__locale);
          }
        } else if (this.isReference) {
          if (value.constructor === DBRef) {
            return value;
          } else {
            //TODO: probably some more logic needed here to create a DB ref
            return new DBRef(value);
          }
        } else if (this._type === ObjectID) {
          return new ObjectID(value.toString());
        } else if (this._type.isType) {
          return new this._type(value, obj);
        } else {
          return this._type(value);
        }
      } else {
        return value;
      }
    }

    //If this is an array, we need to init all the entries of the array.
    if (this.array && Array.isArray(value)) {

      var arr = [];
      for (let i=0; i<value.length; i++) {
        arr.push(subcast.call(this, value[i], obj));
      }

      return arr;
    } else {
      return subcast.call(this, value, obj);
    }
  }

  get name() {
    return this._name;
  }

  get secure() {
    return this._secure;
  }

  get validators() {
    return this._validators;
  }

  get hydrate() {
    return this._hydrate;
  }

  get type() {
    return this._type;
  }

  get array() {
    return this._array;
  }

  get isType() {
    return this._type.isType;
  }

  get isLocale() {
    return this._type.isLocale;
  }

  get isArray() {
    return this._array;
  }

  get isStructure() {
    return this._type.isStructure;
  }

  get isModel() {
    return this._type.isModel;
  }

  get isSubDocument() {
    return (this._type.isModel && this.hydrate) || this._type.isStructure ? true : false;
  }

  get isReference() {
    return (this._type.isModel && !this.hydrate) ? true : false;
  }

  canRead(roles) {
    return this.canAction(roles, 'read');
  }

  canUpdate(roles) {
    return this.canAction(roles, 'update');
  }

  canAction(roles, action) {
    //System role can do any action, mate.
    if (roles.indexOf('System') !== -1) {
      return true;
    }

    //If security has been set for this property
    if (this.secure && this.secure[action]) {
      roles = Array.isArray(roles) ? roles : [roles];

      //Since security has been set, we are not allowed to access this, yet...

      //For all the Roles this User has
      for (let i = 0; i < roles.length; i++) {
        let role = roles[i];

        //If any of their roles are mentioned, they can update, so short circuit
        if (this.secure[action].indexOf(role) !== -1) {
          return true;
        }
      }

      return false;
    } else {
      return true;
    }
  }

  /**
   * TODO CLIENTSIDE hack Remove this and refactor for more intelligent client side models
   * @param property
   * @returns {*}
   */
  static serialize(property) {
    var typeName;

    if (property.type.isType) {
      typeName = 'Types.' + property.type.cls;
    } else if (property.type.cls) {
      typeName = `"Models.${property.type.isStructure ? 'structures' : 'models'}.${property.type.cls}"`;;
    } else if (property.type.name) {
      typeName = property.type.name;
    } else if (property.type === 'self') {
      //TODO: how to reference self on the client side?
      typeName = 'self';
    } else if (property.type.constructor === String) {
      typeName = `"Models.${property.type.split('.')[0].toLowerCase()}s.${property.type.split('.')[1]}"`;;
    }

    var str = `
      {
        type: ${typeName},
        array: ${property.array ? 'true' : 'false'},
        hydrate: ${property.hydrate ? 'true' : 'false'},
        `;

        if (property.secure) {
          str += `secure: ${JSON.stringify(property.secure)}, `;
        }

        if (property.validators) {
          str += `validators: ${JSON.stringify(property.validators)}, `;
        }

        str += `
      }
      `;

    return str;
  }

}


exports = module.exports = Property;