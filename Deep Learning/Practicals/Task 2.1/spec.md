# Specification — My first neural network

## Goal

A notebook, `MyFirstNeuralNetwork.ipynb`, that trains a **multilayer perceptron written from scratch** on the scikit-learn **Digits** dataset (1,797 images of 8 × 8 pixels, 10 classes). Only the gradient is automatic, computed with `autograd`.

**Allowed:** `numpy`, `autograd`, `matplotlib`, and `scikit-learn` only to load the data and split it. **Not allowed:** deep learning frameworks, scikit-learn models, hand-derived gradients.

## Requirements

Each requirement has a check, printed or asserted in the notebook.

| ID | Requirement | Check |
| --- | --- | --- |
| R1 | Load Digits, split 80/20 (stratified, fixed seed), standardize the pixels with the **training** mean and std (std 0 → 1), one-hot the labels. | Shapes: train (1437, 64), test (360, 64), one-hot (1437, 10). |
| R2 | Create weights and biases for each layer; forward pass with a ReLU hidden layer and a 10-class softmax output. | Probabilities have shape (B, 10) and each row sums to 1. |
| R3 | Mean cross-entropy loss, written with `autograd.numpy`. | Equal logits give ln 10 ≈ 2.3026. |
| R4 | Gradient of the loss with respect to the parameters, with `autograd`, checked against finite differences. | Same shapes as the parameters; finite and non-zero; on 5 entries (one per weight/bias array at least) it matches $(L(\theta+\varepsilon) - L(\theta-\varepsilon)) / 2\varepsilon$ with relative error < 1e-4. |
| R5 | Train with mini-batch SGD; record train and test loss and accuracy every epoch and print one line per epoch. | The training loss goes down. |
| R6 | Report the final test accuracy, plot the loss and accuracy curves, and show a 4 × 4 grid of test images with predicted and true labels. | Test accuracy ≥ 90 %; plots visible. |
| R7 | Show a confusion matrix of the test set, with a short interpretation. | It sums to 360; its diagonal / 360 = test accuracy. |
| R8 | Clear error messages (`ValueError`) for: layer dimension mismatch, empty mini-batch, label outside 0–9, and a loss that becomes `NaN` during training. | One cell triggers the four cases and prints their messages. |

## Constraints

- One seed makes every run identical.
- The notebook runs top to bottom ("Restart and run all") in under a minute, CPU only.
- One section per phase, each code cell preceded by a Markdown cell. Simple steps get 2–4 lines; the key learning concepts (forward pass and ReLU, stable softmax, cross-entropy, what the gradient is taken with respect to, He initialization, the SGD update, reading the curves) get a fuller explanation of up to about 8 lines.
- Everything in English.
