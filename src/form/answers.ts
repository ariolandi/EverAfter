/** How an attendance answer reads to guests and organizers. */
export const answerLabel = (answer: boolean) => (answer ? 'Ще присъства' : 'Няма да присъства');

/** How a guest answering for themselves reads their answer. */
export const ownAnswerLabel = (answer: boolean) => (answer ? 'Ще присъствам' : 'Няма да присъствам');
