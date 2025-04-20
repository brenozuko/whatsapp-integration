import { Router } from "express";
import {
  connectWhatsApp,
  disconnectWhatsAppSession,
  getWhatsAppContacts,
} from "../controllers/whatsapp.controller";

const router: Router = Router();

router.get("/connect", connectWhatsApp);
router.get("/contacts", getWhatsAppContacts);
router.post("/disconnect", disconnectWhatsAppSession);

export default router;
