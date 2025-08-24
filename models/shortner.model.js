// import { db } from "../config/db-client.js";

export const loadLinks = async () => {
  const [rows] = await db.execute("select * from short_links");
  return rows;
};

export const insertShortLink = async ({ url, shortCode }) => {
  const [result] = await db.execute(
    "insert into short_links(short_code, url) values(?, ?)",
    [shortCode, url]
  );
  return result;
};

export const getLinkByShortCode = async (shortcode) => {
  const [rows] = await db.execute("select * from short_links where short_code = ?", [shortcode]);
  return rows.length > 0 ? rows[0] : null;
};
