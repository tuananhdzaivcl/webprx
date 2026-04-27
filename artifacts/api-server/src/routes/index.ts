import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import productsRouter from "./products";
import ordersRouter from "./orders";
import depositsRouter from "./deposits";
import accountRouter from "./account";
import referralRouter from "./referral";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(productsRouter);
router.use(ordersRouter);
router.use(depositsRouter);
router.use(accountRouter);
router.use(referralRouter);
router.use(adminRouter);

export default router;
