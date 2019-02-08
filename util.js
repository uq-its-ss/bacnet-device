//
// BACnet device implementation.
// Utility functions.
//

const bacnet = require('bacstack');

class Util
{
	/**
	 * Take an enum group and a value, and return the string text for that enum.
	 *
	 * @example
	 * // Both lines will output `PRESENT_VALUE`
	 * console.log(
	 *   getEnumName(
	 *     bacnet.enum.PropertyIdentifier,
	 *     bacnet.enum.PropertyIdentifier.PRESENT_VALUE
	 *   )
	 * );
	 * console.log(getEnumName(bacnet.enum.PropertyIdentifier, 85));
	 */
	static getEnumName(group, value) {
		return Object.keys(group).find(key => group[key] === value);
	}

	/**
	 * Helper function for property values.
	 */
	static getPropName(propertyId) {
		return Util.getEnumName(bacnet.enum.PropertyIdentifier, propertyId);
	}
};

module.exports = Util;
