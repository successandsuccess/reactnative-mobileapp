export const formatCardNumber = cardNumber => {
    const cardArray = cardNumber.split(' ');
    const formatted = cardArray
        .map((item, index) => {
            let itemNumber = '';
            for (let indexNum = 0; indexNum < item.length; indexNum++) {
                itemNumber += 'X';
            }
            if (index < cardArray.length - 1) {
                return itemNumber;
            } else {
                return item;
            }
        })
        .join(' ');
    return formatted;
};

export const formatedNumber = numberString => {
    if (!numberString) { return }
    if (["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].includes(numberString)) {
        return "0" + numberString;
    } else {
        return numberString;
    }
}