import { db } from "../config/db.js";
import { and, eq, gte, lt, lte, sql } from "drizzle-orm";
import {
  usersTable,
  sessionTable,
  shortLinkTable,
  verifyEmailTokensTable,
  passwordResetTokensTable,
  userRealtion,
  oauthAccountsTable,
} from "../drizzle/schema.js";
import argon2 from "argon2";
import crypto from "crypto";

import {
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
  MILLISECONDS_PER_SECOND,
} from "../config/constants.js";

import jwt from "jsonwebtoken";
import session from "express-session";
import { findShortLinkById } from "./shortner.services.js";
import { name } from "ejs";
import { url } from "inspector";
import e from "connect-flash";
import { table } from "console";
// import { sendEmail } from "../lib/nodemailer.js";
import { sendEmail } from "../lib/send-email.js";
import path from "path";
// import fs from "fs/process";
import fs from "node:fs/promises";

import mjml2html from "mjml";
import ejs from "ejs";
import { isUtf8 } from "buffer";

export const getUserByEmail = async (email) => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email));
  return user;
};

export const createUser = async ({ name, email, password }) => {
  return await db
    .insert(usersTable)
    .values({ name, email, password })
    .$returningId();
};

export const hashPassword = async (password) => {
  return await argon2.hash(password);
};

export const comparePassword = async (password, hash) => {
  return await argon2.verify(hash, password);
};

// export const generateToken = ({ id, name, email }) => {
//   return jwt.sign({ id, name, email }, process.env.JWT_SECRET, {
//     expiresIn: "30d",
//   });
// };

export const createSession = async (userId, { ip, userAgent }) => {
  const [session] = await db
    .insert(sessionTable)
    .values({ userId, ip, userAgent })
    .$returningId();
  return session;
};

// ? Create acceass Token
export const createAccessToken = ({ id, name, email, sessionId }) => {
  return jwt.sign({ id, name, email, sessionId }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY / MILLISECONDS_PER_SECOND, // espiresIn: "15m"
  });
};

// create refresh token

export const createRefreshToken = (sessionId) => {
  return jwt.sign({ sessionId }, process.env.JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY / MILLISECONDS_PER_SECOND, //   expiresIn: "1w",
  });
};

// verify JWT Token
export const verifyJWTToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

// Find SessionID
export const findSessionById = async (sessionId) => {
  const [session] = await db
    .select()
    .from(sessionTable)
    .where(eq(sessionTable.id, sessionId));
  return session;
};

// findUserByID
export const findUserById = async (userId) => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  return user;
};

// refreshTokens
export const refreshTokens = async (refreshToken) => {
  try {
    const decodedToken = verifyJWTToken(refreshToken);
    const currentSession = await findSessionById(decodedToken.sessionId);

    if (!currentSession || !currentSession.valid) {
      throw new Error("Invalid Session");
    }

    const user = await findUserById(currentSession.userId);

    if (!user) throw new Error("Invalid User");

    const userInfo = {
      id: user.id,
      name: user.name,
      email: user.email,
      isEmailValid: user.isEmailValid,
      sessionId: currentSession.id,
    };

    const newAccessToken = createAccessToken(userInfo);

    const newRefreshToken = createRefreshToken(currentSession.id);
    return {
      newAccessToken,
      newRefreshToken,
      user: userInfo,
    };
  } catch (error) {
    console.log(error.message);
  }
};

//  ClearUserSession
export const clearUserSession = async (sessionId) => {
  return db.delete(sessionTable).where(eq(sessionTable.id, sessionId));
};

//

export const authenticateUser = async ({ req, res, user, name, email }) => {
  const session = await createSession(user.id, {
    ip: req.clientIP,
    userAgent: req.headers["user-agent"],
  });

  const accessToken = createAccessToken({
    id: user.id,
    name: user.name || name,
    email: user.email || email,
    isEmailValid: false,
    sessionId: session.id,
  });

  const refreshToken = createRefreshToken(session.id);

  const baseConfig = { httpOnly: true, secure: true };

  res.cookie("access_token", accessToken, {
    ...baseConfig,
    maxAge: ACCESS_TOKEN_EXPIRY,
  });

  res.cookie("refresh_token", refreshToken, {
    ...baseConfig,
    maxAge: REFRESH_TOKEN_EXPIRY,
  });
};

// get all short links

// const user = await findUserById(req.user.id);
//   if (!user) return res.redirect("/login");

export const getAllShortLinks = async (userId) => {
  return await db
    .select()
    .from(shortLinkTable)
    .where(eq(shortLinkTable.userId, userId));
};

// generate Random token

export const generateRandomToken = (digit = 8) => {
  const min = 10 ** (digit - 1);
  const max = 10 ** digit; //

  return crypto.randomInt(min, max).toString();
};

// Insert verify Email token

export const insertVerifyEmailToken = async ({ userId, token }) => {
  return db.transaction(async (tx) => {
    try {
      await tx
        .delete(verifyEmailTokensTable)
        .where(lt(verifyEmailTokensTable.expiresAt, sql`CURRENT_TIMESTAMP`));

      // Delete any existing token
      await tx
        .delete(verifyEmailTokensTable)
        .where(eq(verifyEmailTokensTable.userId, userId));
      await tx.insert(verifyEmailTokensTable).values({ userId, token });
    } catch (error) {
      console.error("Failed to insert verification token : ", error);
      throw new Error("Unable to create verification token.");
    }
  });
};

// create verify Email link
// export const createVerifyEmailLink=async({email,token })=>{
//   const
// }
// export const createVerifyEmailLink = async ({ email, token }) => {
//   const uriEncodeEmail = encodeURIComponent(email);

//   return `${process.env.FRONTEND_URL}/verify-email-token?token=${token}&email=${uriEncodeEmail}`;
// };

export const createVerifyEmailLink = async ({ email, token }) => {
  const url = new URL(`${process.env.FRONTEND_URL}/verify-email-token`);

  url.searchParams.append("token", token);
  url.searchParams.append("email", email);

  return url.toString();
};

// Find verification email token
// export const findVerificationEmailToken = async (token, email) => {
//   const tokenData = await db
//     .select({
//       // .select({key:table.column})

//       userId: verifyEmailTokensTable.userId,
//       token: verifyEmailTokensTable.token,
//       expiresAt: verifyEmailTokensTable.expiresAt,
//     })
//     .from(verifyEmailTokensTable)
//     .where(
//       and(
//         eq(verifyEmailTokensTable.token, token),
//         gte(verifyEmailTokensTable.expiresAt, sql`CURRENT_TIMESTAMP`)
//       )
//     );

//   // if token not found
//   if (!tokenData.length) {
//     return null;
//   }
//   const { userId } = tokenData[0]; //const userId=tokendata[0].userId

//   const userData = await db
//     .select({
//       userId: usersTable.id,
//       email: usersTable.email,
//     })
//     .from(usersTable)
//     .where(eq(usersTable.id, userId));

//   // If user not found
//   if (!userData.length) {
//     return null;
//   }

//   return {
//     userId: userData[0].userId,
//     email: userData[0].email,
//     token: userData[0].token,
//     expiresAt: userData[0].expiresAt,
//   };
// };

export const findVerificationEmailToken = async (token, email) => {
  return db
    .select({
      // .select({key:table.column})

      userId: usersTable.id,
      email: usersTable.email,
      token: verifyEmailTokensTable.token,
      expiresAt: verifyEmailTokensTable.expiresAt,
    })
    .from(verifyEmailTokensTable)
    .where(
      and(
        eq(verifyEmailTokensTable.token, token),
        eq(usersTable.email, email),
        gte(verifyEmailTokensTable.expiresAt, sql`CURRENT_TIMESTAMP`)
      )
    )
    .innerJoin(usersTable, eq(verifyEmailTokensTable.userId, usersTable.id));
};

// verifyUserEmail and Update
export const verifyUserEmailAndUpdate = async (userId) => {
  return db
    .update(usersTable)
    .set({ isEmailValid: true })
    .where(eq(usersTable.id, userId));
};

// clearVerifyEmail Tokens

export const clearVerifyEmailTokens = async (userId) => {
  // const [user] = await db
  //   .select()
  //   .from(usersTable)
  //   .where(eq(usersTable.email, email));

  return await db
    .delete(verifyEmailTokensTable)
    .where(eq(verifyEmailTokensTable.userId, userId));
};

export const sendNewVerifyEmailLink = async ({ userId, email }) => {
  const randomToken = generateRandomToken();

  await insertVerifyEmailToken({ userId, token: randomToken });

  const verifyEmailLink = await createVerifyEmailLink({
    email,
    token: randomToken,
  });

  // get the file data

  const mjmlTemplete = await fs.readFile(
    path.join(import.meta.dirname, "..", "emails", "verify-email.mjml"),
    "utf-8"
  );

  // to replace place holder with the actual values
  const filledTemplete = ejs.render(mjmlTemplete, {
    code: randomToken,
    link: verifyEmailLink,
  });

  // convert mjml to html
  const htmlOutput = mjml2html(filledTemplete).html;

  sendEmail({
    to: email,
    subject: "Verify your email",
    html: htmlOutput,
  }).catch(console.error);
};

// update user by name
export const updateUserByName = async ({ userId, name,avatarUrl }) => {
  return await db
    .update(usersTable)
    .set({ name: name,avatarUrl:avatarUrl })
    .where(eq(usersTable.id, userId));
};

// Update User Password
export const updateUserByPassword = async ({ userId, newPassword }) => {
  const newHashPassword = await hashPassword(newPassword);
  return await db
    .update(usersTable)
    .set({ password: newHashPassword })
    .where(eq(usersTable.id, userId));
};

// findUserByEmail
export const findUserByEmail = async (email) => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email));
  return user;
};

export const createResetPasswordLink = async ({ userId }) => {
  const randomToken = crypto.randomBytes(32).toString("hex");

  const tokenHash = crypto
    .createHash("sha256")
    .update(randomToken)
    .digest("hex");

  await db
    .delete(passwordResetTokensTable)
    .where(eq(passwordResetTokensTable.userId, userId));

  await db.insert(passwordResetTokensTable).values({ userId, tokenHash });
  return `${process.env.FRONTEND_URL}/reset-password/${randomToken}`;
};

// get reset |Password token

export const getResetPasswordToken = async (token) => {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const [user] = await db
    .select()
    .from(passwordResetTokensTable)
    .where(
      and(
        eq(passwordResetTokensTable.tokenHash, tokenHash),
        gte(passwordResetTokensTable.expiresAt, sql`CURRENT_TIMESTAMP`)
      )
    );

  return user;
};

// clearResetPasswordToken
export const clearResetPasswordToken = async (userId) => {
  return await db
    .delete(passwordResetTokensTable)
    .where(eq(passwordResetTokensTable.userId, userId));
};




export async function getUserWithOauthId({ email, provider }) {
  const [user] = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      isEmailValid: usersTable.isEmailValid,
      providerAccountId: oauthAccountsTable.providerAccountId,
      provider: oauthAccountsTable.provider,
    })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .leftJoin(
      oauthAccountsTable,
      and(
        eq(oauthAccountsTable.provider, provider),
        eq(oauthAccountsTable.userId, usersTable.id)
      )
    );

  return user;
}





export async function linkUserWithOauth({
  userId,
  provider,
  providerAccountId,
  // avatarUrl,
}) {
  await db.insert(oauthAccountsTable).values({
    userId,
    provider,
    providerAccountId,
  });
}








export async function createUserWithOauth({
  name,
  email,
  provider,
  providerAccountId,
  // avatarUrl,
}) {
  const user = await db.transaction(async (trx) => {
    const [user] = await trx
      .insert(usersTable)
      .values({
        email,
        name,
        // password: "",
        // avatarUrl,
        isEmailValid: true, // we know that google's email are valid
      })
      .$returningId();

    await trx.insert(oauthAccountsTable).values({
      provider,
      providerAccountId,
      userId: user.id,
    });

    return {
      id: user.id,
      name,
      email,
      isEmailValid: true, // not necessary
      provider,
      providerAccountId,
    };
  });

  return user;
}