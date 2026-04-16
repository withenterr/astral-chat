import { Router, type IRouter } from "express";
import healthRouter from "./health";
import serversRouter from "./servers";
import messagesRouter from "./messages";
import presenceRouter from "./presence";
import dmRouter from "./dm";

const router: IRouter = Router();

router.use(healthRouter);
router.use(serversRouter);
router.use(messagesRouter);
router.use(presenceRouter);
router.use(dmRouter);

export default router;
