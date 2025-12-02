
import PHTMLParser from '../src/foundation/PHTMLParser';

const tpl = `<paper-component simple="true" class="page">
  <div class="header">
    <h1>Testing Page</h1>
    <p>Choose subject for testing</p>
  </div>

  <div class="semestr-list">
    @for (semestr in semestrs) {
    <paper-component simple="true" class="semestr-item">
      <p>Semestr @(semestr.number)</p>
      <div class="subject-list">
        @for (subject in semestr.subjects) {
        <re-button variant="outlined" color="additional" data-link
          href="/testing/sub?subject=Информационные%20технологии">
          <div class="content">
            <div class="meta">
              <h3>@(subject.name)</h3>
              <p>Преподаватель: @(subject.teacher)</p>
            </div>
            <div class="chip-column">
              @for (group in subject.groups) {
              <re-chip color="additional">@(group)</re-chip>
              }
            </div>
          </div>
        </re-button>
        }
      </div>
    </paper-component>
    }
  </div>
</paper-component>`;
class Semestr {
  private number: string;
  private subjects: Subject[];
  constructor(number: string, subjects: Subject[]) {
    this.number = number;
    this.subjects = subjects;
  }
}
class Subject {
  private name: string;
  private translatedName?: string;
  private teacher: string;
  private groups: string[];

  constructor(name: string, teacher: string, groups: string[], translatedName?: string) {
    this.name = name;
    this.teacher = teacher;
    this.groups = groups;
    this.translatedName = translatedName;
  }
}

const semestrs: Semestr[] = [
    new Semestr("&#8545;", []),
    new Semestr("&#8546;", [
      new Subject("InfTech", "Həsənov Elçin Qafar oğlu", ["759ITS"], "Инфоомационные технологии"),
      new Subject("BaseProg", "Həsənov Elçin Qafar oğlu", ["759ITS"], "Основы программирования"),
      new Subject("DiffEqua", "Quliyeva Fətimə Ağayar qızı", ["759ITS", "759KM"], "Дифференциальные уравнения"),
      new Subject("Instrumental", "Gasanova Vusala Ramiz qızı", ["759ITS"], "Инструментальные и прикладные программы"),
      new Subject("Physics", "Əlizade Leyla Eldar qızı", ["759ITS", "759KM"], "Физика"),
      new Subject("LinearAlgebra", "Quliyeva Fətimə Ağayar qızı", ["759ITS", "759KM"], "Линейная алгебра"),
      new Subject("English", "Ismayilova Aybəniz Arif qızı", ["759ITS", "759KM"], "Английский язык"),
    ]),
    new Semestr("&#8547;", []),
  ]
const parser = new PHTMLParser();
const html2 = parser.parse(tpl, { semestrs: semestrs });

console.log(html2);