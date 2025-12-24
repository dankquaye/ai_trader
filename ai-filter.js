// ai-filter.js - Advanced TensorFlow.js Integration
// Implements: Meta-Signal Confidence, Outcome-Predictive Models, Regime Classification,
// Temporal Pattern Recognition (LSTM), Drift Detection, Ensemble Voting, RL, Explainability.

/**
 * Advanced AI Filter using TensorFlow.js
 * Features:
 * - LSTM Ensemble for Temporal Pattern Recognition
 * - Regime Classification (Trending, Ranging, Volatile)
 * - Reinforcement Learning (Q-Learning) for Dynamic Thresholding
 * - Online Learning with Drift Detection
 */
class AIFilter {
    constructor() {
        this.models = []; // Ensemble of LSTM models
        this.regimeModel = null; // Regime Classifier
        this.rlAgent = new QLAgent();

        this.isTrained = false;
        this.isTraining = false;
        this.status = 'Idle';

        this.accuracy = 0; // Ensemble accuracy
        this.minAccuracyThreshold = 55; // Drift Detection Threshold
        this.driftDetected = false;

        this.lookBack = 10; // LSTM Time Steps
        this.featureCount = 8;

        this.memory = { inputs: [], labels: [] }; // Experience Replay Buffer
        this.maxMemorySize = 5000;

        this.ensembleSize = 3;
    }

    /**
     * Initialize the AI engine
     */
    async init() {
        if (!window.tf) {
            console.error('TensorFlow.js not loaded');
            return;
        }

        try {
            // Use WebGL for performance if available, else CPU
            await tf.setBackend('webgl').catch(() => tf.setBackend('cpu'));
            this.log(`Backend set to ${tf.getBackend()}`);
        } catch (e) {
            console.warn('Backend init error:', e);
        }

        // Initialize Ensemble
        this.models = [];
        for(let i=0; i<this.ensembleSize; i++) {
            this.models.push(this.createLSTMModel());
        }

        // Initialize Regime Classifier
        this.regimeModel = this.createRegimeModel();

        this.log(`AI Initialized: ${this.ensembleSize} LSTM Models + Regime Classifier + RL Agent`);
    }

    /**
     * Create a standardized LSTM Model
     * @returns {tf.Sequential}
     */
    createLSTMModel() {
        const model = tf.sequential();

        // Input Shape: [TimeSteps, Features]
        // Temporal Pattern Recognition Layer
        model.add(tf.layers.lstm({
            units: 32,
            returnSequences: false, // Only last output needed for classification
            inputShape: [this.lookBack, this.featureCount],
            recurrentInitializer: 'glorotNormal'
        }));

        model.add(tf.layers.dropout({ rate: 0.2 }));

        // Dense Layers for Outcome Prediction
        model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
        model.add(tf.layers.dense({ units: 8, activation: 'relu' }));

        // Output: Probability of 'Rise'
        model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

        model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'binaryCrossentropy',
            metrics: ['accuracy']
        });

        return model;
    }

    /**
     * Create Regime Classifier Model
     * @returns {tf.Sequential}
     */
    createRegimeModel() {
        // Simple classifier for Market Regime based on single snapshot features
        const model = tf.sequential();
        model.add(tf.layers.dense({ units: 16, activation: 'relu', inputShape: [this.featureCount] }));
        model.add(tf.layers.dense({ units: 4, activation: 'softmax' })); // 4 Regimes: Trending Up, Trending Down, Ranging, Volatile

        model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'categoricalCrossentropy',
            metrics: ['accuracy']
        });
        return model;
    }

    // --- Data Management (Online Learning) ---

    /**
     * Add a sample to the memory buffer for online learning
     * @param {number[][]} historySequence - [TimeSteps, Features]
     * @param {number} label - 0 or 1
     */
    addSample(historySequence, label) {
        // historySequence must be [LookBack, Features]
        if (!historySequence || historySequence.length !== this.lookBack) return;

        // Deep copy to avoid reference issues
        const seqCopy = JSON.parse(JSON.stringify(historySequence));

        this.memory.inputs.push(seqCopy);
        this.memory.labels.push(label);

        if (this.memory.inputs.length > this.maxMemorySize) {
            this.memory.inputs.shift();
            this.memory.labels.shift();
        }

        // Auto-Retrain Logic (Feedback-Supervised Online Learning)
        // Train every 20 new samples
        if (this.memory.inputs.length % 20 === 0 && this.memory.inputs.length >= 50) {
            this.trainMemory();
        }
    }

    /**
     * Train models on the memory buffer
     */
    async trainMemory() {
        if (this.isTraining) return;
        this.isTraining = true;
        this.status = 'Retraining...';

        let inputsTensor = null;
        let labelsTensor = null;

        try {
            inputsTensor = tf.tensor3d(this.memory.inputs); // [Batch, Time, Feat]
            labelsTensor = tf.tensor2d(this.memory.labels, [this.memory.labels.length, 1]); // [Batch, 1]

            let totalAcc = 0;

            // Train Ensemble
            for (let i = 0; i < this.models.length; i++) {
                const h = await this.models[i].fit(inputsTensor, labelsTensor, {
                    epochs: 5,
                    batchSize: 32,
                    shuffle: true,
                    validationSplit: 0.1
                });
                const acc = h.history.val_acc ? h.history.val_acc[h.history.val_acc.length-1] : h.history.acc[h.history.acc.length-1];
                totalAcc += acc;
            }

            this.accuracy = (totalAcc / this.models.length) * 100;

            // Model Drift Detection
            if (this.accuracy < this.minAccuracyThreshold) {
                this.driftDetected = true;
                this.status = `Drift Detected (Acc: ${this.accuracy.toFixed(1)}%)`;
                this.log('WARNING: Model Accuracy dropped below threshold. AI Disabled.');
            } else {
                this.driftDetected = false;
                this.status = `Active (Acc: ${this.accuracy.toFixed(1)}%)`;
                this.isTrained = true;
            }

        } catch (e) {
            console.error('Training Error:', e);
            this.status = 'Training Error';
        } finally {
            if(inputsTensor) inputsTensor.dispose();
            if(labelsTensor) labelsTensor.dispose();
            this.isTraining = false;
        }
    }

    // --- Prediction Core (Ensemble & Explainability) ---

    /**
     * Make a prediction based on sequential data
     * @param {number[][]} sequence - [TimeSteps, Features]
     * @returns {Object|null} Prediction result
     */
    async predict(sequence) {
        // sequence: [LookBack, Features] (2D Array)
        if (!this.isTrained || this.driftDetected) return null;
        if (!sequence || sequence.length !== this.lookBack) return null;

        return tf.tidy(() => {
            const input = tf.tensor3d([sequence]); // [1, LookBack, Feat]

            // 1. Ensemble Voting
            const predictions = this.models.map(m => m.predict(input).dataSync()[0]);

            // Average Probability
            const avgProb = predictions.reduce((a, b) => a + b, 0) / predictions.length;

            // 2. Meta-Signal Confidence Scoring
            // Variance between models implies uncertainty.
            // Also distance from 0.5 implies confidence.
            const variance = predictions.reduce((a, b) => a + Math.pow(b - avgProb, 2), 0) / predictions.length;
            const stdDev = Math.sqrt(variance);

            // Confidence Score: High if Agreement (Low StdDev) AND High Signal Strength (Close to 0 or 1)
            const signalStrength = Math.abs(avgProb - 0.5) * 2; // 0 to 1
            const agreement = Math.max(0, 1 - (stdDev * 2)); // 0 to 1
            const confidence = (signalStrength * 0.7) + (agreement * 0.3);

            // 3. Regime Classification (using last timestep)
            const lastStep = tf.tensor2d([sequence[sequence.length-1]]);
            const regimeProbs = this.regimeModel.predict(lastStep).dataSync();
            const regimeIndex = regimeProbs.indexOf(Math.max(...regimeProbs));
            const regimes = ['Uptrend', 'Downtrend', 'Ranging', 'Volatile'];

            // 4. RL Adjustment (Policy Application)
            // Get action from RL Agent based on state
            // State: [RegimeIndex (0-3), ConfidenceBucket (0-4)]
            const confBucket = Math.min(4, Math.floor(confidence * 5));
            const rlAction = this.rlAgent.getAction([regimeIndex, confBucket]);
            // Actions: 0=Tighten, 1=Neutral, 2=Loosen

            let finalThreshold = 0.60;
            if (rlAction === 0) finalThreshold = 0.75;
            if (rlAction === 2) finalThreshold = 0.55;

            return {
                probability: avgProb,
                confidence: confidence,
                regime: regimes[regimeIndex],
                regimeId: regimeIndex,
                threshold: finalThreshold,
                rlAction: rlAction,
                rawPredictions: predictions
            };
        });
    }

    // --- Reinforcement Learning Integration ---

    updateRL(state, action, reward) {
        // state: [Regime, ConfidenceBucket]
        // action: 0, 1, 2
        // reward: 1 (Win), -1 (Loss)
        this.rlAgent.learn(state, action, reward);
    }

    // --- Helpers ---

    get isReliable() {
        return this.isTrained && !this.driftDetected;
    }

    log(msg) {
        console.log(`[AI-Filter] ${msg}`);
    }
}

// --- Reinforcement Learning Agent (Q-Learning) ---

class QLAgent {
    constructor() {
        this.qTable = {}; // Key: "Regime-Conf", Value: [Q_Action0, Q_Action1, Q_Action2]
        this.alpha = 0.1; // Learning Rate
        this.gamma = 0.9; // Discount Factor
        this.epsilon = 0.1; // Exploration Rate
        this.actions = [0, 1, 2]; // Tighten, Neutral, Loosen
    }

    getStateKey(state) {
        return `${state[0]}-${state[1]}`;
    }

    getQ(state) {
        const key = this.getStateKey(state);
        if (!this.qTable[key]) {
            this.qTable[key] = [0, 0, 0]; // Init zeros
        }
        return this.qTable[key];
    }

    getAction(state) {
        const qs = this.getQ(state);
        if (Math.random() < this.epsilon) {
            return this.actions[Math.floor(Math.random() * this.actions.length)];
        }
        // Argmax
        let maxQ = -Infinity;
        let action = 1;
        qs.forEach((q, i) => {
            if (q > maxQ) {
                maxQ = q;
                action = i;
            }
        });
        return action;
    }

    learn(state, action, reward) {
        const qs = this.getQ(state);
        const currentQ = qs[action];
        // We assume next state is not critical for this simple contextual bandit-like adaptation
        qs[action] = currentQ + this.alpha * (reward - currentQ);
    }
}
