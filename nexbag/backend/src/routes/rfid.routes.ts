import { Router } from 'express';
import { rfidController } from '../controllers/rfid.controller';
import { validate } from '../middleware/validate.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { deviceOwnerMiddleware } from '../middleware/device-owner.middleware';
import {
  createRfidTagSchema,
  updateRfidTagSchema,
  rfidTagsQuerySchema,
} from '../validators/rfid.validator';

const router = Router();
router.use(authMiddleware, deviceOwnerMiddleware);

// GET /v1/rfid/tags
router.get('/tags', validate(rfidTagsQuerySchema, 'query'), rfidController.getTagList);

// POST /v1/rfid/tags
router.post('/tags', validate(createRfidTagSchema), rfidController.createTag);

// PATCH /v1/rfid/tags/:tagId
router.patch('/tags/:tagId', validate(updateRfidTagSchema), rfidController.updateTag);

// DELETE /v1/rfid/tags/:tagId
router.delete('/tags/:tagId', rfidController.deleteTag);

// GET /v1/rfid/live
router.get('/live', rfidController.getLiveStatus);

export default router;
