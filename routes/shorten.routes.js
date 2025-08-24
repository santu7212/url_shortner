import { Router } from "express";
import {
  postURLshortner,
  getShortnerPage,
  redirectToshortLinks,
  getShortnerEditPage,deleteShortCode
} from "../controller/postshortner.controller.js";
const router = Router();


router.get("/", getShortnerPage);

// Shorten URL handler
router.post("/", postURLshortner);

// Redirect shortened URLs
router.get("/:shortCode", redirectToshortLinks);

router.route("/edit/:id").get(getShortnerEditPage);

router.route("/delete/:id").post(deleteShortCode);



export const shortnerRoutes = router;
