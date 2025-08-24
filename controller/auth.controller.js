// import { name } from "ejs";
import { ConsoleLogWriter } from "drizzle-orm";
import {
  getUserByEmail,
  createUser,
  comparePassword,
  hashPassword,
  createSession,
  createAccessToken,
  createRefreshToken,
  clearUserSession,
  authenticateUser,
  findSessionById,
  findUserById,
  generateRandomToken,
  insertVerifyEmailToken,
  createVerifyEmailLink,
  clearVerifyEmailTokens,
  verifyUserEmailAndUpdate,
  findVerificationEmailToken,
  sendNewVerifyEmailLink,
  updateUserByName,
  updateUserByPassword,
  createResetPasswordLink,
  findUserByEmail,
  getResetPasswordToken,
  clearResetPasswordToken,
  getUserWithOauthId,
  linkUserWithOauth,
  createUserWithOauth,
  getAllShortLinks
} from "../services/auth.services.js";
import {
  registerUserSchema,
  loginUserSchema,
  verifyEmailSchema,
  verifyUserSchema,
  verifyPasswordSchema,
  forgotPasswordSchema,
  verifResetPasswordSchema,
  setPasswordSchema,
} from "../validators/auth-validator.js";
import {
  ACCESS_TOKEN_EXPIRY,
  OAUTH_EXCHANGE_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
} from "../config/constants.js";

import { sendEmail } from "../lib/send-email.js";
import { getHtmlFromMjmlTemplate } from "../lib/get-html-from-mjml-template.js";
import { decodeIdToken, generateCodeVerifier, generateState } from "arctic";
import { google } from "../lib/oauth/google.js";
import { stat } from "node:fs";
import { github } from "../lib/oauth/github.js";
import { error } from "node:console";

export const getRegesterPage = (req, res) => {
  if (req.user) return res.redirect("/");
  res.render("auth/register", { errors: req.flash("errors") });
}; // Add 'auth/' to the path

export const postRegisterPage = async (req, res) => {
  if (req.user) return res.redirect("/");
  // console.log(req.body);
  // const { name, email, password } = req.body;

  const { data, error } = registerUserSchema.safeParse(req.body);
  if (error) {
    const errorMessage = error.errors[0].message;
    req.flash("errors", errorMessage);
    return res.redirect("/register"); // ✅ Add 'return' here
  }
  const { name, email, password } = data;

  const userExist = await getUserByEmail(email);
  console.log(userExist);

  // if (userExist) return res.redirect("/register");
  if (userExist) {
    req.flash("errors", "User alredy exist");
    return res.redirect("/register");
  }

  const hashedPassword = await hashPassword(password);
  const [user] = await createUser({ name, email, password: hashedPassword });

  console.log(user);

  // res.redirect("/login");
  // /? WE NEED TO CREATE A SESSION
  await authenticateUser({ req, res, user, name, email });

  await sendNewVerifyEmailLink({ email, userId: user.id });

  res.redirect("/");
};

export const getLoginPage = (req, res) => {
  if (req.user) return res.redirect("/");
  res.render("auth/login", { errors: req.flash("errors") }); // Add 'auth/'
};

export const postLogin = async (req, res) => {
  // res.setHeader("Set-Cookie", "isLoggedIn=true; path=/;");
  if (req.user) return res.redirect("/");

  // const { email, password } = req.body;
  const { data, error } = loginUserSchema.safeParse(req.body);
  if (error) {
    const errorMessage = error.errors[0].message;
    req.flash("errors", errorMessage);
    return res.redirect("/login"); // ✅ Add 'return' here
  }
  const { email, password } = data;

  const user = await getUserByEmail(email);
  // console.log("User", user);

  if (!user) {
    req.flash("errors", "Invalid Email and password");
    return res.redirect("/login");
  }

  if (!user.password) {
    req.flash(
      "errors",
      "You have created account using social login. please login with your scoial account ."
    );

    return res.redirect("/login");
  }

  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    req.flash("errors", "Invalid Email and password");
    return res.redirect("/login");
  }

  // if(user.password !==password)  return res.redirect("/login")

  // res.redirect("/login")
  // res.cookie("isLoggedIn", true);
  // const token = generateToken({
  //   id: user.id,
  //   name: user.name,
  //   email: user.email,
  // });

  // res.cookie("access_token", token);

  //? WE NEED TO CREATE A SESSION
  await authenticateUser({ req, res, user });

  res.redirect("/");
};

export const getME = (req, res) => {
  if (!req.user) return res.send("Not logged in ");

  return res.send(`<h1>Hey  ${req.user.name} - ${req.user.email}</h1>`);
};

export const logoutUser = async (req, res) => {
  await clearUserSession(req.user.sessionId);
  res.clearCookie("access_token");
  res.clearCookie("refresh_token");
  res.redirect("/login");
};

// getProfile Page
export const getProfilePage = async (req, res) => {
  if (!req.user) return res.send("Not logged in");

  const user = await findUserById(req.user.id);
  if (!user) return res.redirect("/login");

  const userShortLinks = await getAllShortLinks(user.id);

  return res.render("auth/profile", {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      isEmailValid: user.isEmailValid,
      hasPassword: Boolean(user.password),
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      links: userShortLinks,
    },
  });
};

// get verify Email page

export const getVerifyEmailPage = async (req, res) => {
  if (!req.user) return res.redirect("/");
  const user = await findUserById(req.user.id);
  if (!user || user.isEmailValid) return res.redirect("/");

  return res.render("auth/verify-email", {
    email: req.user.email,
  });
};

// resend verification link

export const resendVerificationLink = async (req, res) => {
  if (!req.user) return res.redirect("/");
  const user = await findUserById(req.user.id);
  if (!user || user.isEmailValid) return res.redirect("/");
  await sendNewVerifyEmailLink({ email: req.user.email, userId: req.user.id });

  res.redirect("/verify-email");
};

// Verify Email Token

// export const verifyEmailToken = async (req, res) => {
//   const { data, error } = verifyEmailSchema.safeParse(req.query);

//   if (error) {
//     return res.send("Verification link invalid or expired");
//   }

//   const token= await findVerificationEmailToken(data);
//   console.log("Verification token", token);
//   if(!token){
//     res.send("Verification link invalid or expired");
//   }

//   await verifyUserEmailAndUpdate(user.email)

//   // clearVerifyEmailTokens(token.email).catch(console.error)
//   clearVerifyEmailTokens(token.id).catch(console.error)

//   return res.redirect("/profile")

// };

// export const verifyEmailToken = async (req, res) => {
//   const { data, error } = verifyEmailSchema.safeParse(req.query);
//   if (error) return res.send("Verification link invalid or expired");

//   // const tokenRecord = await findVerificationEmailToken(data.token);
//     const [tokenRecord] = await findVerificationEmailToken(data.token);
//   if (!tokenRecord) return res.send("Verification link invalid or expired");

//   await verifyUserEmailAndUpdate(tokenRecord.userId);
//   clearVerifyEmailTokens(tokenRecord.userId).catch(console.error);

//   return res.redirect("/profile");
// };

export const verifyEmailToken = async (req, res) => {
  const { data, error } = verifyEmailSchema.safeParse(req.query);
  if (error) return res.send("Verification link invalid or expired");

  const [tokenRecord] = await findVerificationEmailToken(
    data.token,
    data.email
  );
  if (!tokenRecord) return res.send("Verification link invalid or expired");

  await verifyUserEmailAndUpdate(tokenRecord.userId);
  clearVerifyEmailTokens(tokenRecord.userId).catch(console.error);

  return res.redirect("/profile");
};

// GetEditProfile Page
export const getEditProfilePage = async (req, res) => {
  if (!req.user) return res.redirect("/");
  const user = await findUserById(req.user.id);
  if (!user) return res.status(404).send("User not found ");
  return res.render("auth/edit-profile", {
    name: user.name,
    avatarUrl:user.avatarUrl,
    error: req.flash("error"),
  });
};

// PostEditProfile
export const postEditProfile = async (req, res) => {
  if (!req.user) return res.redirect("/");

  const { data, error } = verifyUserSchema.safeParse(req.body);
  if (error) {
    const errorMessage = error.errors.map((err) => err.message);
    req.flash("errors", errorMessage);
    return res.redirect("/edit-profile");
  }

  const fileUrl = req.file ? `/uploads/avatar/${req.file.filename}` : undefined;
  await updateUserByName({
    userId: req.user.id,
    name: data.name,
    avatarUrl: fileUrl,
  });

  return res.redirect("/profile");
};

// get change password page

// export const getChangePasswordPage=async (req, res)=>{
//   if (!req.user) return res.redirect("/");

//   return res.render ("auth/change-password",{
//     error: req.flash("errors")
//   })

// }

export const getChangePasswordPage = async (req, res) => {
  if (!req.user) return res.redirect("/");

  return res.render("auth/change-password", {
    // user: req.user,                // ✅ Pass user for status badge
    errors: req.flash("errors"), // ✅ Match "errors" in EJS
  });
};

// post change PassWord
export const postChangePassword = async (req, res) => {
  const { data, error } = verifyPasswordSchema.safeParse(req.body);
  if (error) {
    const errorMessage = error.errors.map((err) => err.message);
    req.flash("errors", errorMessage);
    return res.redirect("/change-password");
  }

  // console.log("data:",data);

  const { currentPassword, newPassword } = data;

  const user = await findUserById(req.user.id);
  if (!user) return res.status(404).send("User not found ");
  const isPasswordValid = comparePassword(currentPassword, user.password);
  if (!isPasswordValid) {
    req.flash("errors", "Current password that you entered is invalid");
    return res.redirect("change-password");
  }

  await updateUserByPassword({ userId: user.id, newPassword });
  return res.redirect("/profile");
};

// getResetPasswordPage
export const getResetPasswordPage = async (req, res) => {
  return res.render("auth/forgot-password", {
    formSubmitted: req.flash("formSubmitted")[0],
    errors: req.flash("errors"),
  });
};

// postForgotPassword

export const postForgotPassword = async (req, res) => {
  const { data, error } = forgotPasswordSchema.safeParse(req.body);

  if (error) {
    const errorMessage = error.errors.map((err) => err.message);
    req.flash("error", errorMessage[0]);
    return res.redirect("/reset-password");
  }

  const user = await findUserByEmail(data.email);
  if (user) {
    const resetPasswordLink = await createResetPasswordLink({
      userId: user.id,
    });

    const html = await getHtmlFromMjmlTemplate("reset-password-email", {
      name: user.name,
      link: resetPasswordLink,
    });

    sendEmail({
      to: user.email,
      subject: "RESET YOUR PASSWORD",
      html,
    });
  }

  req.flash("formSubmitted", true);

  return res.redirect("/reset-password");
};

// get-resetpassword Token Page
export const getResetPasswordTokenPage = async (req, res) => {
  const { token } = req.params;
  const passwordResetData = await getResetPasswordToken(token);

  if (!passwordResetData) return res.render("auth/wrong-reset-password-token");

  return res.render("auth/reset-password", {
    formSubmitted: req.flash("formSubmitted")[0],
    errors: req.flash("errors"),
    token,
  });
};

// postResetPasswoed Token
export const postResetPasswordToken = async (req, res) => {
  const { token } = req.params;
  const passwordResetData = await getResetPasswordToken(token);

  if (!passwordResetData) {
    req.flash("errors", "Password Token is not matching");
    return res.render("auth/wrong-reset-password-token");
  }

  const { data, error } = verifResetPasswordSchema.safeParse(req.body);
  if (error) {
    const errorMessage = error.errors.map((err) => err.message);
    req.flash("errors", errorMessage[0]);
    res.redirect(`/reset-password/${token}`);
  }
  const { newPassword } = data;

  const user = await findUserById(passwordResetData.userId);

  await clearResetPasswordToken(user.id);

  await updateUserByPassword({ userId: user.id, newPassword });

  return res.redirect("/login");
};

// getGoogleLoginPage
export const getGoogleLoginPage = async (req, res) => {
  if (req.user) return res.redirect("/");

  const state = generateState();

  const codeVerifier = generateCodeVerifier();

  const url = google.createAuthorizationURL(state, codeVerifier, [
    "openid",
    "profile",
    "email",
  ]);

  const cookieConfig = {
    httpOnly: true,
    secure: true,
    maxAge: OAUTH_EXCHANGE_EXPIRY,
    sameSite: "lax",
  };

  res.cookie("google_oauth_state", state, cookieConfig);
  res.cookie("google_code_verifier", codeVerifier, cookieConfig);

  res.redirect(url.toString());
};

// getGoogleLoginCallback
export const getGoogleLoginCallback = async (req, res) => {
  const { code, state } = req.query;
  console.log(code, state);

  const {
    google_oauth_state: storedState,
    google_code_verifier: codeVerifier,
  } = req.cookies;

  if (
    !code ||
    !state ||
    !storedState ||
    !codeVerifier ||
    state !== storedState
  ) {
    req.flash(
      "errors",
      "Couldn't login with Google because of invalid login attempt. Please try again!"
    );
    return res.redirect("/login");
  }

  let tokens;
  try {
    tokens = await google.validateAuthorizationCode(code, codeVerifier);
  } catch {
    req.flash(
      "errors",
      "Could not login with Google because of an invalid login attempt. Please try again!"
    );
    return res.redirect("/auth/login");
  }

  console.log("Google tokens:", tokens);

  const claims = decodeIdToken(tokens.idToken());
  const { sub: googleUserId, name, email, picture } = claims;

  let user = await getUserWithOauthId({
    provider: "google",
    email,
  });

  if (!user) {
    // User does not exist, create them
    user = await createUserWithOauth({
      name,
      email,
      provider: "google",
      providerAccountId: googleUserId,
      avatarUrl: picture,
    });
  } else if (!user.providerAccountId) {
    // User exists, but not linked to OAuth — link them
    await linkUserWithOauth({
      userId: user.id,
      provider: "google",
      providerAccountId: googleUserId,
      avatarUrl: picture,
    });
  }

  await authenticateUser({ req, res, user, name, email });
  res.redirect("/");
};

// getGithub Login page
export const getGithubLoginPage = async (req, res) => {
  if (req.user) return res.redirect("/");

  const state = generateState();

  const url = github.createAuthorizationURL(state, ["user:email"]);

  const cookieConfig = {
    httpOnly: true,
    secure: true,
    maxAge: OAUTH_EXCHANGE_EXPIRY,
    sameSite: "lax",
  };

  res.cookie("github_oauth_state", state, cookieConfig);

  res.redirect(url.toString());
};

// getGithubLoginCallback

export const getGithubLoginCallback = async (req, res) => {
  const { code, state } = req.query;
  const { github_oauth_state: storedState } = req.cookies;

  function handleFailedLogin() {
    req.flash(
      "errors",
      "Couldn't login with GitHub because of invalid login attempt. Please try again!"
    );
    return res.redirect("/login");
  }

  if (!code || !state || !storedState || state !== storedState) {
    return handleFailedLogin();
  }

  let tokens;
  try {
    tokens = await github.validateAuthorizationCode(code);
  } catch {
    return handleFailedLogin();
  }

  const githubUserResponse = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokens.accessToken()}`,
    },
  });
  if (!githubUserResponse.ok) return handleFailedLogin();
  const githubUser = await githubUserResponse.json();
  const { id: githubUserId, name } = githubUser;

  const githubEmailResponse = await fetch(
    "https://api.github.com/user/emails",
    {
      headers: {
        Authorization: `Bearer ${tokens.accessToken()}`,
      },
    }
  );
  if (!githubEmailResponse.ok) return handleFailedLogin();

  const emails = await githubEmailResponse.json();
  const email = emails.filter((e) => e.primary)[0].email; // In GitHub we can have multiple emails, but we only want primary email
  if (!email) return handleFailedLogin();

  let user = await getUserWithOauthId({
    provider: "github",
    email,
  });

  if (user && !user.providerAccountId) {
    await linkUserWithOauth({
      userId: user.id,
      provider: "github",
      providerAccountId: githubUserId,
    });
  }

  if (!user) {
    user = await createUserWithOauth({
      name,
      email,
      provider: "github",
      providerAccountId: githubUserId,
    });
  }

  await authenticateUser({ req, res, user, name, email });

  res.redirect("/");
};

// getSetPasswordPage
export const getSetPasswordPage = async (req, res) => {
  if (!req.user) return res.redirect("/");

  return res.render("auth/set-password", {
    errors: req.flash("errors"),
  });
};

//postSetPassword
export const postSetPassword = async (req, res) => {
  if (!req.user) return res.redirect("/");

  const { data, error } = setPasswordSchema.safeParse(req.body);

  if (error) {
    const errorMessages = error.errors.map((err) => err.message);
    req.flash("errors", errorMessages);
    return res.redirect("/set-password");
  }

  const { newPassword } = data;

  const user = await findUserById(req.user.id);
  if (user.password) {
    req.flash(
      "errors",
      "You already have your Password, Instead Change your password"
    );
    return res.redirect("/set-password");
  }

  await updateUserByPassword({ userId: req.user.id, newPassword });

  return res.redirect("/profile");
};
