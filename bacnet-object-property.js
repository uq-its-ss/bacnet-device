//
// BACnet device implementation.
// Property of an object, such as the current value or maximum reading.
//

const nodeUtil = require('util');
const bacnet = require('bacstack');

const propertyTypeMap = require('./typemap-property');
const Util = require('./util');

const pi = bacnet.enum.PropertyIdentifier;

const typeEnumMap = {
	[pi.OBJECT_TYPE]: bacnet.enum.ObjectType,
};

class BACnetObjectProperty
{
	constructor(obj, propertyId, typeId = undefined, readOnly = false) {
		this.obj = obj;
		this.propertyId = propertyId;
		this.typeId = typeId || propertyTypeMap[propertyId];
		this.readOnly = readOnly;
		this.subscriptions = [];

		if (this.typeId === undefined) {
			throw new Error(`Property ${Util.getPropName(propertyId)} has no default `
				+ `type set, you must specify one yourself or update the bacnet-device `
				+ `Node module.`);
		}

		this.callbacks = [];
	}

	get value() {
		return this._value;
	}

	set value(newValue) {
		if (this.readOnly) {
			throw new Error(`Property ${Util.getPropName(this.propertyId)} cannot be changed.`);
		}
		this._value = newValue;

		// Notify any subscribeCov listeners.
		this.obj.onPropertyChanged(this);

		// Notify and subscribeProperty listeners.
		this.callbacks.forEach(cb => {
			cb.fn(this);
		});
	}

	addCallback(id, fn) {
		this.callbacks.push({
			id: id,
			fn: fn,
		});
	}

	removeCallback(id) {
		this.callbacks = this.callbacks.filter(cb => cb.id !== id);
	}

	valueAsString() {
		let lookup = typeEnumMap[this.propertyId];
		let value = this._value;
		if (lookup) {
			value = Util.getEnumName(lookup, value);
		}
		return value;
	}

	toString() {
		return `BACnetObjectProperty { ${Util.getPropName(this.propertyId)} = ${this.valueAsString()} }`;
	}

	[nodeUtil.inspect.custom]() {
		return this.toString();
	}
};

module.exports = BACnetObjectProperty;
