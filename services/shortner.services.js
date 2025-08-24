// import { count } from "console";
import { db } from "../config/db.js";
import { shortLinkTable } from "../drizzle/schema.js";
import { count, desc, eq } from "drizzle-orm";

export const getAllShortLinks = async ({userId, limit = 10, offset = 0}) => {
  const condition = eq(shortLinkTable.userId, userId);
  const shortLinks = await db
    .select()
    .from(shortLinkTable)
    .where(condition)
    .orderBy(desc(shortLinkTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [{totalCount} ]= await db
    .select({ totalCount: count() })
    .from(shortLinkTable)
    .where(condition);


    return  {shortLinks,totalCount}
};

export const getLinkByShortCode = async (shortCode) => {
  const [result] = await db
    .select()
    .from(shortLinkTable)
    .where(eq(shortLinkTable.shortCode, shortCode));

  return result;
};

export const insertShortLink = async ({ url, shortCode, userId }) => {
  await db.insert(shortLinkTable).values({ url, shortCode, userId });
};

// FindShortLinkByid

export const findShortLinkById = async (id) => {
  const [result] = await db
    .select()
    .from(shortLinkTable)
    .where(eq(shortLinkTable.id, id));
  return result;
};

// DeleteShortCodeById

export const deleteShortCodeById = async (id) => {
  return await db.delete(shortLinkTable).where(eq(shortLinkTable.id, id));
};
