const HOSTING_ORIGIN = "https://reidelsaltres.github.io/Hellper";
const HOSTING = "/Hellper";
const markup = "./src/pages/TestingPage.phtml";
const origgin = "https://reidelsaltres.github.io";

const url = new URL(`${HOSTING_ORIGIN}/${markup}`,origgin);


const url2 = new URL(HOSTING + "/", origgin);

console.log(url2.href);