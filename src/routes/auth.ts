import { Router } from "express";
import * as AuthController from "../controllers/auth";
import { validate } from "../middlewares/validate";
import { authMiddleware } from "../middlewares/auth";
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resendCodeSchema,
} from "../utils/validation";

const router = Router();

router.post("/register", validate(registerSchema), AuthController.register);
router.post("/verify-email", validate(verifyEmailSchema), AuthController.verifyEmail);
router.post("/resend-code", validate(resendCodeSchema), AuthController.resendCode);
router.get("/check-username/:username", AuthController.checkUsername);
router.post("/login", validate(loginSchema), AuthController.login);
router.post("/forgot-password", validate(forgotPasswordSchema), AuthController.forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), AuthController.resetPassword);
router.post("/refresh-token", AuthController.refreshToken);
router.post("/logout", authMiddleware, AuthController.logout);
router.get("/me", authMiddleware, AuthController.getMe);

export default router;
