import mongoose from 'mongoose';

const analysisSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['AUDIT', 'SENTIMENT', 'LIQUIDITY'],
        default: 'AUDIT',
        required: true,
        index: true
    },
    tokenName: {
        type: String,
        required: true
    },
    tokenAddress: {
        type: String,
        required: false, // Not required for Sentiment
        index: true
    },
    contractAddress: {
        type: String,
        required: false // Not required for Sentiment
    },
    chainId: {
        type: String,
        default: 'solana'
    },
    overallRiskScore: {
        type: Number
    },
    geminiAnalysis: {
        type: Object, // Stores the full JSON report
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('Analysis', analysisSchema);
