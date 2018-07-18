/**
 * @param {number} char
 * @return {boolean}
 */
export function token (char) {
	switch (char) {
		// \0 \t \n \s
		case 0: case 9: case 10: case 32:
		// { } ; ,
		case 123: case 125: case 59: case 44:
		// [ ( " '
		case 91: case 40: case 34: case 39:
		// ! #
		case 33: case 35:
			return 1
		default:
			return 0
	}
}

/**
 * @param {Array<string>} root
 * @param {string} value
 * @return {string}
 */
export function compile (root, value) {
	return this.parse([root], [0], 0, this.iterator(value))
}

/**
 * @param {Array<string>} selector
 * @param {Array<string>} ruleset
 * @param {Array<string>} sibling
 */
export function generate (selector, ruleset, sibling) {
	return (ruleset.length ? selector.join(',') + '{'+ruleset.join(';') + '}' : '') + sibling.join('')
}

/**
 * @param {Array<string>} cascade
 * @param {Array<number>} position
 * @param {number} size
 * @param {object} iterator
 * @return {string}
 */
export function parse (cascade, position, size, iterator) {
	var ruleset = []
	var sibling = []
	var value = ''
	var breakpoint = 0
	var ampersand = 0
	var priority = 0
	var atrule = 0
	var length = 0
	var caret = 0
	var char = 0
	var prev = 0
	var next = 0

	outer:
		while (next = iterator.next())
			switch (prev = char, char = next) {
				// /
				case 47:
					switch (iterator.next()) {
						// *
						case 42:
							while (next = iterator.next())
								if (next === 42 && iterator.next() === 47)
									break
							break
						// /
						case 47:
							while (next = iterator.next())
								if (next === 10)
									break
							break
					}
					break
				// \t \n \s
				case 9: case 10: case 32:
					while (next = iterator.peek())
						if (next < 33)
							iterator.next()
						else
							break

					if (token(prev) | token(next))
						break

					value += ' '
					break
				// [ ]
				case 91: char++
				// ( )
				case 40: char++
				// " '
				case 34: case 39:
					caret = iterator.caret()

					while (next = iterator.next())
						if (next === char)
							break

					value += iterator.slice(caret - 1, iterator.caret())
					break
				// }
				case 125:
					break outer
				// {
				case 123:
					position[length++] = value.length
				// ;
				case 59:
					switch (char + atrule) {
						// ;
						case 59:
							ruleset.push(this.declaration(value, breakpoint, priority))
							break
						// {
						case 123:
							cascade.push(this.selector(value, position, cascade[size], length, ampersand, priority))
							sibling.push(this.parse(cascade, position, size + 1, iterator))
							break
						// @i
						case 164:
							sibling.push(this.group(atrule, value))
							break
						// @m
						case 168:
							break
					}
					value = '', ampersand = priority = atrule = length = 0
					break
				// ,
				case 44:
					position[length++] = value.length
				default:
					switch (value += String.fromCharCode(char), char) {
						// &
						case 38:
							ampersand = value.length - 1
							break
						// :
						case 58:
							breakpoint = value.length - 1
							break
						// !
						case 33:
							priority = iterator.peek()
							break
						// @
						case 64:
							atrule = iterator.peek()
							break
					}
			}

	if (value.length)
		ruleset.push(this.declaration(value, breakpoint, priority))

	return this.generate(cascade.pop(), ruleset, sibling)
}
