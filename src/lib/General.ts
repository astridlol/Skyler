const prettify = (s: string, titleCase: boolean = false) => {
	let newString = s.replace(/(_|-)/gi, ' ');
	newString = newString.charAt(0).toUpperCase() + newString.slice(1);
	if (!titleCase) return newString;
	else
		return newString
			.split(' ')
			.map((word) => word[0].toUpperCase() + word.substring(1))
			.join(' ');
};

export { prettify };
