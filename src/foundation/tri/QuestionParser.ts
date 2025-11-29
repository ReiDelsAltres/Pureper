export default interface QuestionParser {
    UseUndex: boolean;
    Questions: Question[];
}
export interface Question {
    Id: number;
    Title: string;
    Answer: string[];
}