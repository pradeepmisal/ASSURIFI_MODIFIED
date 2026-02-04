/**
 * Validates if a string is a valid Ethereum address
 */
function isValidEthereumAddress(address) {
    return /^0x[0-9a-fA-F]{40}$/.test(address);
}

/**
 * Middleware to validate 'contract-address' header for contract analysis
 */
export const validateContractAddress = (req, res, next) => {
    const contractAddress = req.headers['contract-address'];

    if (!contractAddress) {
        return res.status(400).json({ error: "Missing contract-address in request header" });
    }

    if (!isValidEthereumAddress(contractAddress)) {
        return res.status(400).json({ error: "Invalid Ethereum address format" });
    }

    // Attach validated address to request object for downstream use
    req.contractAddress = contractAddress;
    next();
};

/**
 * Middleware to validate 'code' body parameter for source code analysis
 */
export const validateSourceCode = (req, res, next) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ error: "Missing contract source code in request body" });
    }

    // Attach validated code to request object
    req.sourceCode = code;
    next();
};
