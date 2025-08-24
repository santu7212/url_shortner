 
import fs  from "fs/promises"
import path from    "path"
import ejs from "ejs"
import mjml2html from "mjml";


export const getHtmlFromMjmlTemplate = async (templete, data) => {
  // 1 read the data
   const mjmlTemplete = await fs.readFile(
  path.join(process.cwd(), "emails", `${templete}.mjml`),
  "utf-8"
);



  const filledTemplete=ejs.render(mjmlTemplete,data)

  return mjml2html(filledTemplete).html
};
