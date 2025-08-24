import crypto from "crypto";
import {
  getAllShortLinks,
  getLinkByShortCode,
  insertShortLink,
  findShortLinkById,
  deleteShortCodeById,
} from "../services/shortner.services.js";
import z from "zod";
import { shortenerSearchParamsSchema } from "../validators/shortner-validator.js";

export const getShortnerPage = async (req, res) => {
  try {
    if (!req.user) return res.redirect("/login");
    // const links = await getAllShortLinks(req.user.id);

    const searchParams = shortenerSearchParamsSchema.parse(req.query);

    const { shortLinks, totalCount } = await getAllShortLinks({
      userId: req.user.id,
      limit: 10,
      offset: (searchParams.page - 1) * 10,
    });
    // tootalCount=100
    const totalPages = Math.ceil(totalCount / 10)

    return res.render("index", {
      links:shortLinks,
      host: req.host,
      currentPage:searchParams.page,
      totalPages:totalPages,
      errors: req.flash("errors"),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
};

export const postURLshortner = async (req, res) => {
  try {
    if (!req.user) return res.redirect("/login");
    const { url, shortCode } = req.body;
    const finalShortCode = shortCode || crypto.randomBytes(4).toString("hex");

    const link = await getLinkByShortCode(finalShortCode);

    if (link) {
      req.flash(
        "errors",
        "URL with the shortCode already exist ,Please chooose another"
      );
      return res.redirect("/");
    }

    await insertShortLink({
      url,
      shortCode: finalShortCode,
      userId: req.user.id,
    });

    return res.redirect("/");
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
};

export const redirectToshortLinks = async (req, res) => {
  try {
    const { shortCode } = req.params;
    const link = await getLinkByShortCode(shortCode);

    if (!link) return res.redirect("/404");

    return res.redirect(link.url);
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
};

// getShortnerEditPage

export const getShortnerEditPage = async (req, res) => {
  if (!req.user) return res.redirect("/login");
  const { data: id, error } = z.coerce.number().int().safeParse(req.params.id);
  if (error) return res.redirect("/404");

  try {
    const shortLink = await findShortLinkById(id);
    if (!shortLink) return res.redirect("/404");

    res.render("edit-shortLink", {
      id: shortLink.id,
      url: shortLink.url,
      shortCode: shortLink.shortCode,
      errors: req.flash("errors"),
    });
  } catch (error) {
    return res.status(500).send("Internal server error ");
  }
};

export const deleteShortCode = async (req, res) => {
  try {
    const { data: id, error } = z.coerce
      .number()
      .int()
      .safeParse(req.params.id);
    if (error) return res.redirect("/404");

    await deleteShortCodeById(id);
    return res.redirect("/");
  } catch (error) {
    return res.status(500).send("Internal server error ");
  }
};
