import TemplateEngine, { SyntaxRule } from './../src/foundation/TemplateEngine';

const sample = `Hello @(title), this is @(*specialExpression*) and @(user.name)`;
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
              <re-chip color="additional">@(group)@(encodeURIComponent(JSON.stringify(subject)))</re-chip>
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

const engine = new TemplateEngine();
const matches = engine.test(tpl);
console.log('Matches:', matches);