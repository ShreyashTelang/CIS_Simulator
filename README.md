# 📐 Columnar Transposition Cipher Simulator

An interactive, zero-dependency educational simulator for the **Columnar Transposition Cipher**, built for the **Cryptography and Information Security (CIS)** academic syllabus. 

Designed with a graph-paper / engineering blueprint aesthetic, this simulator visualizes the row-by-row inscription and column-by-column extraction process for both **regular (padded)** and **irregular (unpadded)** transpositions. It features step-by-step playback, real-time frequency analysis, Index of Coincidence calculation, and round-trip verification.

---

## 🚀 Live Demo & Quick Start

Because this simulator is built strictly with vanilla web technologies, no build tools, package managers, or server installations are required:

1. Clone or download this repository.
2. Open `index.html` directly in any modern web browser (Chrome, Edge, Firefox, Safari).
3. Alternatively, enable **GitHub Pages** under repository settings (`main` branch -> `/root`) for instant web hosting.

---

## ✨ Features

### 1. Dual Operational Modes
* **🔒 Encrypt Mode**: Inscribes the sanitized plaintext horizontally into an $R \times K$ grid, then extracts the columns vertically in alphabetical rank order.
* **🔓 Decrypt Mode**: Calculates exact column heights (accounting for short columns in irregular transposition), slices the ciphertext into corresponding chunks, reconstructs the matrix columns in rank order, and reads rows left-to-right to recover the plaintext.

### 2. Alphabetical Key Ranking & Tie-Breaking
* Automatically sorts keyword letters alphabetically to determine column extraction order ($1$ to $K$).
* **Deterministic Tie-Breaking**: When the keyword contains duplicate letters (e.g., `BANANA`), ties are resolved strictly **from left to right** (producing ranks `4 1 5 2 6 3`).
* A dedicated **Key Ranking Ribbon** and color-coded column badges display the derived permutation sequence.

### 3. Regular vs. Irregular Transposition
* **Irregular Transposition (Default)**: Leaves the final row incomplete if the message length $L$ is not a multiple of the key length $K$. Columns are partitioned into lengths $\lceil L/K \rceil$ and $\lfloor L/K \rfloor$.
* **Regular Transposition (Padded)**: Optional checkbox to pad incomplete rows to a complete rectangle using a chosen pad character (default `X`). Includes an automatic **Trim Padding** tool on decryption.

### 4. Step-by-Step Animation & Visual Matrix
* **Playback Controls**: Step forward (`Next Column`), step backward (`Prev`), `Auto Play / Pause`, `Reset`, and `Show Result`.
* **Adjustable Speed**: Playback slider ranging from $0.2\text{s}$ (Fast) to $1.8\text{s}$ (Slow).
* **Color-Coded Columns**: 12 harmonious, high-contrast column colors that visually match extracted chunks with matrix columns.
* **Live Step Explanation Banner**: Contextual commentary for each step describing exactly which column is being read or filled.

### 5. Progressive Output & Format Toggles
* Output builds up progressively in real-time as animation steps proceed.
* Toggle output formatting between:
  * **Chunks**: Color-coded tokens showing individual column extractions.
  * **Blocks of 5**: Standard classical military cryptogram grouping (`EVLNA CDTES...`).
  * **Continuous**: Contiguous unspaced text string.
* One-click **Copy to Clipboard** with toast notification feedback.

### 6. Round-Trip Verification ("Use Result as Input")
* Feed the generated ciphertext directly back as input, automatically toggling between Encrypt and Decrypt modes so students can verify that decryption restores the original plaintext.

### 7. Syllabus Theory & Cryptanalysis Section
* **Tab 1: Algorithm Mechanics**: Permutations, matrix dimensions, and regular vs. irregular rules.
* **Tab 2: Vulnerabilities & Cryptanalysis**:
  * *Conservation of Unigram Frequencies*: Explains why letter frequencies remain identical to English ($E \approx 12.7\%$).
  * *Index of Coincidence ($IoC$)*: Shows why $IoC \approx 0.067$ unmasks transposition compared to polyalphabetic substitution ($IoC \approx 0.038$).
  * *Factoring & Multiple Anagramming*: Explains how digram probabilities (`TH`, `HE`, `IN`, `ER`) enable cryptanalysts to pair columns and reconstruct keys without brute force.
* **Tab 3: Frequency & $IoC$ Inspector**: Live dynamic histogram comparing letter counts in the active message with standard English expectations.
* **Tab 4: Historical & Modern Context**: American Civil War ciphers, WWI German Ubchi cipher, WWII SOE poem codes, and diffusion layers in modern AES (`ShiftRows` and `MixColumns`).

### 8. Engineering Graph-Paper Aesthetic & Accessibility
* Technical graph-paper grid pattern with major and minor grid lines.
* **Light and Dark Mode** with seamless automatic preference detection and manual override.
* Fully responsive layout with touch-friendly controls ($\ge 42\text{px}$) and horizontal table scrolling on mobile viewports.
* Visible focus rings (`:focus-visible`) and keyboard shortcuts for accessibility.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Space` | Toggle Auto Play / Pause |
| `Arrow Right` (`→`) | Next Column Step |
| `Arrow Left` (`←`) | Previous Column Step |
| `R` / `r` | Reset Animation to Step 0 |

*(Shortcuts are disabled while actively typing inside text inputs or textareas)*

---

## 📁 Repository Structure

```
CIS_Simulator/
├── index.html     # Semantic HTML5 layout, UI components, accessibility markup
├── style.css      # Graph-paper patterns, theme variables, matrix layout, animations
├── script.js     # Cryptographic engine, key ranking, animation controller, DOM logic
└── README.md      # Project documentation, theoretical background, and usage guide
```

---

## 📚 Example Test Cases

You can test these pre-configured syllabus examples directly using the **Syllabus Presets** bar in the app:

| Preset Name | Plaintext Message | Keyword | Padding | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Classic** | `WE ARE DISCOVERED FLEE AT ONCE` | `ZEBRAS` | No | Classic irregular transposition (25 letters, 6 cols). |
| **Tie-Breaker** | `ATTACK POSTPONED UNTIL TOMORROW` | `BANANA` | No | Demonstrates repeated letters and left-to-right tie-breaking. |
| **Regular Padded** | `FLEE AT ONCE WE ARE DISCOVERED` | `CIPHER` | Yes (`X`) | Padded to a complete rectangular matrix. |
| **WWII SOE** | `DEFEND THE EAST WALL OF THE CASTLE` | `GERMAN` | No | Historical Special Operations Executive (SOE) scenario. |

---

## 🛡️ License

This project is licensed under the [MIT License](LICENSE) — free for educational, academic, and personal use.
