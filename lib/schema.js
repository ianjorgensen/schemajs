var _ = require('underscore');
var rules = require('./rules.js');

var Schema = function(schema)
{
	this.schema = schema;
};

Schema.prototype.validate = function(data, options)
{
	options = options || {};
	var params = Object.keys(this.schema);
	var errors = {};
	var values = {};
	var value;
	var get    = typeof(data) == "function" ? data : function(p) { return data[p]; };
	var that = this;
	
	console.log(params);
	console.log(params.length);

	var validateProperty = function(parameter) {
		console.log(parameter);
	
		var schema = that.schema[parameter];
		
		try
		{
         // if undefined, don't store it.
         value = rules.create(parameter, schema).apply(get(parameter));

         if(!_.isUndefined(value)) 
         {
            values[parameter] = value;
         }

			// does this rule contain embedded schemas
			if(typeof(schema.schema) == "object" && !_.isArray(schema.schema) && Object.keys(schema.schema).length && !_.isUndefined(values[parameter]))
			{
				if(schema.type == "object")
				{
					Object.keys(schema.schema).forEach(function(param)
					{
						try
						{
                     // if undefined, don't store it
                     value = rules.create(parameter + "." + param, schema.schema[param]).apply(get(parameter)[param]);

                     if(!_.isUndefined(value))
                     {
                        values[parameter][param] = value;
                     }
						}
						catch(error)
						{
							errors[parameter + "." + param] = error;
						}
					});
				}
				else if(schema.type == "array")
				{
					values[parameter].forEach(function(value, index)
					{
						try
						{
                     // if not required and undefined, don't store in values!
							values[parameter][index] = rules.create(parameter + "[" + index + "]", schema.schema).apply(value);
						}
						catch(error)
						{
							errors[parameter + "[" + index + "]"] = error;
						}
					});
				}
			}
		}
		catch(error)
		{
			errors[parameter] = error;
		}
	};

	for(var i = 0; i < params.length; i++)
	{
		if (options.partial) {
			if (!data[params[i]]) {
				continue;
			}
		} 
		validateProperty(params[i]);
	}

	return {data:values, errors:errors, valid:Object.keys(errors).length === 0};
};

exports.types        = rules.types;
exports.properties   = rules.properties;
exports.filters      = rules.filters;
exports.create       = function(schema) { return new Schema(schema); };
exports.middleware   = function(schema)
{
   return function(req, res, next)
   {
      req.form = new Schema(schema).validate(req.route.method == "post" ? req.body : req.query);
      next();
   };
};
