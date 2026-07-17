import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import zonesRouter from "./zones.js";
import routeRouter from "./route.js";
import binsRouter from "./bins.js";
import rewardsRouter from "./rewards.js";
import transitRouter from "./transit.js";
import narrateRouter from "./narrate.js";
import statsRouter from "./stats.js";
import authRouter from "./auth.js";
import usersRouter from "./users.js";
import { startDrift } from "../lib/stadiumData.js";

// Start simulated density drift on server startup
startDrift();

const router: IRouter = Router();

router.use(healthRouter);
router.use("/zones", zonesRouter);
router.use("/route", routeRouter);
router.use("/bins", binsRouter);
router.use("/rewards", rewardsRouter);
router.use("/transit", transitRouter);
router.use("/narrate", narrateRouter);
router.use("/stats", statsRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);

export default router;

