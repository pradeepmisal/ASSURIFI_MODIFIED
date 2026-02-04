import express from 'express';
import ContractController from '../controllers/contract.controller.js';
import { validateContractAddress, validateSourceCode } from '../middlewares/validators.js';
import { optionalProtect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// GET /analyze-contract?contract-address=...
// The path here is '/' because it will be mounted at '/analyze-contract' in app.js
router.get('/', optionalProtect, validateContractAddress, ContractController.analyzeByAddress);

// POST /analyze-contract (Body: { sourceCode: ... } OR { smart_contract_address: ... })
router.post('/', optionalProtect, ContractController.analyzeBySourceCode);

// DEBUG Routes
router.get('/etherscan', ContractController.getRawEtherscanData);

export default router;
