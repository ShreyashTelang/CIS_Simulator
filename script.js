(function() {
      'use strict';

      // 12 High-Contrast Harmonious Column Colors (accessible in light/dark)
      const COLUMN_COLORS = [
        'var(--c1)',  'var(--c2)',  'var(--c3)',  'var(--c4)',
        'var(--c5)',  'var(--c6)',  'var(--c7)',  'var(--c8)',
        'var(--c9)',  'var(--c10)', 'var(--c11)', 'var(--c12)'
      ];

      // Standard English letter frequencies (for reference)
      const ENGLISH_FREQ = {
        A: 8.2, B: 1.5, C: 2.8, D: 4.3, E: 12.7, F: 2.2, G: 2.0, H: 6.1,
        I: 7.0, J: 0.15, K: 0.77, L: 4.0, M: 2.4, N: 6.7, O: 7.5, P: 1.9,
        Q: 0.09, R: 6.0, S: 6.3, T: 9.1, U: 2.8, V: 0.98, W: 2.4, X: 0.15,
        Y: 2.0, Z: 0.07
      };

      // State Management
      const state = {
        mode: 'encrypt', // 'encrypt' or 'decrypt'
        rawMessage: 'WE ARE DISCOVERED FLEE AT ONCE',
        cleanMessage: '',
        keyword: 'ZEBRAS',
        cleanKeyword: '',
        padEnabled: false,
        padChar: 'X',
        outputFormat: 'chunks', // 'chunks', 'blocks5', 'continuous'
        
        // Calculated Grid & Cipher Data
        ranks: [],          // array of ranks for each key index [6, 3, 2, 4, 1, 5]
        rankToCol: [],      // array of physical column indices ordered by rank 1..K
        colLengths: [],     // length of each physical column
        grid: [],           // 2D matrix [row][col]
        totalRows: 0,
        totalCols: 0,
        chunks: [],         // extracted chunks in rank order
        finalOutput: '',

        // Animation State
        currentStep: 0,     // 0 = start, 1..K = processing columns, K+1 = complete
        maxSteps: 0,
        isPlaying: false,
        playTimer: null,
        playIntervalMs: 900
      };

      // DOM Elements
      const themeToggleBtn = document.getElementById('themeToggleBtn');
      const themeIconSun = document.getElementById('themeIconSun');
      const themeIconMoon = document.getElementById('themeIconMoon');

      const modeEncryptBtn = document.getElementById('modeEncryptBtn');
      const modeDecryptBtn = document.getElementById('modeDecryptBtn');
      const inputSectionHeading = document.getElementById('inputSectionHeading');
      const messageLabel = document.getElementById('messageLabel');
      const messageInput = document.getElementById('messageInput');
      const keywordInput = document.getElementById('keywordInput');
      const keyLenHint = document.getElementById('keyLenHint');
      const padCheckbox = document.getElementById('padCheckbox');
      const padCharInput = document.getElementById('padCharInput');
      const keyRankRibbon = document.getElementById('keyRankRibbon');

      const rawCountBadge = document.getElementById('rawCountBadge');
      const cleanCountBadge = document.getElementById('cleanCountBadge');
      const gridDimensionsBadge = document.getElementById('gridDimensionsBadge');

      const resetBtn = document.getElementById('resetBtn');
      const prevBtn = document.getElementById('prevBtn');
      const nextBtn = document.getElementById('nextBtn');
      const playPauseBtn = document.getElementById('playPauseBtn');
      const playIcon = document.getElementById('playIcon');
      const pauseIcon = document.getElementById('pauseIcon');
      const playPauseText = document.getElementById('playPauseText');
      const showResultBtn = document.getElementById('showResultBtn');
      const speedSlider = document.getElementById('speedSlider');
      const speedDisplay = document.getElementById('speedDisplay');

      const stepCounterBadge = document.getElementById('stepCounterBadge');
      const stepExplanation = document.getElementById('stepExplanation');
      const stepProgressFill = document.getElementById('stepProgressFill');
      const matrixHeading = document.getElementById('matrixHeading');
      const matrixStateTag = document.getElementById('matrixStateTag');
      const gridContainer = document.getElementById('gridContainer');

      const outputHeading = document.getElementById('outputHeading');
      const outputDisplay = document.getElementById('outputDisplay');
      const fmtChunksBtn = document.getElementById('fmtChunksBtn');
      const fmtFiveBtn = document.getElementById('fmtFiveBtn');
      const fmtContinuousBtn = document.getElementById('fmtContinuousBtn');
      const copyOutputBtn = document.getElementById('copyOutputBtn');
      const stripPadBtn = document.getElementById('stripPadBtn');
      const stripPadBtnText = document.getElementById('stripPadBtnText');
      const useResultBtn = document.getElementById('useResultBtn');
      const useResultText = document.getElementById('useResultText');

      const toastNotice = document.getElementById('toastNotice');
      const toastMsg = document.getElementById('toastMsg');

      // Preset Buttons
      const presetDefault = document.getElementById('presetDefault');
      const presetTies = document.getElementById('presetTies');
      const presetPadded = document.getElementById('presetPadded');
      const presetWWII = document.getElementById('presetWWII');

      // Theory & Educational Elements
      const eduTabBtns = document.querySelectorAll('.edu-tab-btn');
      const eduPanes = document.querySelectorAll('.edu-pane');
      const freqBarsContainer = document.getElementById('freqBarsContainer');
      const maxFreqCount = document.getElementById('maxFreqCount');
      const iocDisplay = document.getElementById('iocDisplay');
      const factorsDisplay = document.getElementById('factorsDisplay');

      // -------------------------------------------------------------
      // 1. Theme Management (Light / Dark)
      // -------------------------------------------------------------
      function initTheme() {
        const savedTheme = localStorage.getItem('columnar-cipher-theme');
        const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const activeTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
        setTheme(activeTheme);
      }

      function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('columnar-cipher-theme', theme);
        if (theme === 'dark') {
          themeIconSun.style.display = 'block';
          themeIconMoon.style.display = 'none';
        } else {
          themeIconSun.style.display = 'none';
          themeIconMoon.style.display = 'block';
        }
      }

      themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(nextTheme);
        showToast(`Switched to ${nextTheme} mode`);
      });

      // -------------------------------------------------------------
      // 2. Sanitization & Key Ordering Logic
      // -------------------------------------------------------------
      function sanitizeLetters(str) {
        return (str || '').toUpperCase().replace(/[^A-Z]/g, '');
      }

      /**
       * Calculates alphabetical ranks for keyword letters.
       * Breaks ties strictly left-to-right.
       * E.g., 'ZEBRAS' -> [6, 3, 2, 4, 1, 5]
       * E.g., 'BANANA' -> [4, 1, 5, 2, 6, 3]
       */
      function calculateRanks(keyword) {
        if (!keyword) return [];
        const items = keyword.split('').map((char, index) => ({ char, index }));
        items.sort((a, b) => {
          if (a.char < b.char) return -1;
          if (a.char > b.char) return 1;
          return a.index - b.index; // Left-to-right tie breaking
        });

        const ranks = new Array(keyword.length);
        items.forEach((item, sortedIdx) => {
          ranks[item.index] = sortedIdx + 1; // 1-indexed rank
        });
        return ranks;
      }

      function getColColor(rank) {
        const idx = (rank - 1) % COLUMN_COLORS.length;
        return COLUMN_COLORS[idx];
      }

      // -------------------------------------------------------------
      // 3. Mathematical Cipher Engine (Encrypt & Decrypt)
      // -------------------------------------------------------------
      function computeCipherData() {
        state.cleanMessage = sanitizeLetters(messageInput.value);
        state.cleanKeyword = sanitizeLetters(keywordInput.value);
        state.padEnabled = padCheckbox.checked;
        const rawPad = padCharInput.value.toUpperCase().replace(/[^A-Z]/g, '');
        state.padChar = rawPad.length > 0 ? rawPad[0] : 'X';

        const K = state.cleanKeyword.length;

        // If inputs are empty or keyword is missing
        if (K === 0 || state.cleanMessage.length === 0) {
          state.ranks = [];
          state.rankToCol = [];
          state.colLengths = [];
          state.grid = [];
          state.totalRows = 0;
          state.totalCols = 0;
          state.chunks = [];
          state.finalOutput = '';
          state.maxSteps = 0;
          state.currentStep = 0;
          renderEmptyState();
          updateStatsBadges();
          renderFrequencyChart();
          return;
        }

        state.ranks = calculateRanks(state.cleanKeyword);
        state.totalCols = K;

        // Map rank (1..K) to physical column index (0..K-1)
        state.rankToCol = [];
        for (let r = 1; r <= K; r++) {
          state.rankToCol.push(state.ranks.indexOf(r));
        }

        if (state.mode === 'encrypt') {
          computeEncryption();
        } else {
          computeDecryption();
        }

        state.maxSteps = K;
        // Keep step in valid bounds
        if (state.currentStep > state.maxSteps) {
          state.currentStep = state.maxSteps;
        }

        updateStatsBadges();
        renderKeyRankRibbon();
        renderMatrix();
        updateStepUI();
        renderOutput();
        renderFrequencyChart();
      }

      function computeEncryption() {
        const K = state.totalCols;
        let text = state.cleanMessage;
        
        // Handle padding if enabled
        let padCount = 0;
        if (state.padEnabled) {
          const rem = text.length % K;
          if (rem > 0) {
            padCount = K - rem;
            text += state.padChar.repeat(padCount);
          }
        }

        const L = text.length;
        const R = Math.ceil(L / K);
        state.totalRows = R;

        // Fill grid row by row
        state.grid = Array.from({ length: R }, () => new Array(K).fill(null));
        for (let i = 0; i < L; i++) {
          const r = Math.floor(i / K);
          const c = i % K;
          const isPad = i >= state.cleanMessage.length;
          state.grid[r][c] = {
            char: text[i],
            isPad: isPad,
            originalIndex: i
          };
        }

        // Calculate column lengths
        state.colLengths = new Array(K);
        for (let c = 0; c < K; c++) {
          let count = 0;
          for (let r = 0; r < R; r++) {
            if (state.grid[r][c] !== null) count++;
          }
          state.colLengths[c] = count;
        }

        // Extract chunks in rank order
        state.chunks = [];
        let fullCiphertext = '';
        for (let s = 0; s < K; s++) {
          const colIdx = state.rankToCol[s];
          let chunkStr = '';
          for (let r = 0; r < R; r++) {
            const cell = state.grid[r][colIdx];
            if (cell !== null) {
              chunkStr += cell.char;
            }
          }
          state.chunks.push({
            rank: s + 1,
            col: colIdx,
            text: chunkStr
          });
          fullCiphertext += chunkStr;
        }

        state.finalOutput = fullCiphertext;
      }

      function computeDecryption() {
        const K = state.totalCols;
        const text = state.cleanMessage; // Ciphertext
        const L = text.length;
        const R = Math.ceil(L / K);
        state.totalRows = R;

        const rem = L % K;
        state.colLengths = new Array(K);
        for (let c = 0; c < K; c++) {
          // If irregular, first rem columns have length R, rest have R-1
          state.colLengths[c] = Math.floor(L / K) + (rem > 0 ? (c < rem ? 1 : 0) : 0);
        }

        // Prepare empty grid structure with dimensions
        state.grid = Array.from({ length: R }, () => new Array(K).fill(null));

        // Slice ciphertext chunks according to rank order
        state.chunks = [];
        let ptr = 0;
        for (let s = 0; s < K; s++) {
          const colIdx = state.rankToCol[s];
          const len = state.colLengths[colIdx];
          const chunkStr = text.slice(ptr, ptr + len);
          ptr += len;

          state.chunks.push({
            rank: s + 1,
            col: colIdx,
            text: chunkStr
          });

          // Place into grid
          for (let r = 0; r < len; r++) {
            state.grid[r][colIdx] = {
              char: chunkStr[r] || '',
              isPad: false,
              originalIndex: r * K + colIdx
            };
          }
        }

        // Read reconstructed plaintext row by row
        let recoveredText = '';
        for (let r = 0; r < R; r++) {
          for (let c = 0; c < K; c++) {
            if (state.grid[r][c] !== null) {
              recoveredText += state.grid[r][c].char;
            }
          }
        }
        state.finalOutput = recoveredText;
      }

      // -------------------------------------------------------------
      // 4. UI Rendering Functions
      // -------------------------------------------------------------
      function updateStatsBadges() {
        const rawLen = messageInput.value.length;
        const cleanLen = state.cleanMessage.length;
        rawCountBadge.textContent = `Raw: ${rawLen} chars`;
        cleanCountBadge.textContent = `Processed: ${cleanLen} letters (A-Z)`;
        
        if (state.totalCols > 0 && state.totalRows > 0) {
          gridDimensionsBadge.textContent = `Grid: ${state.totalRows} rows Ã— ${state.totalCols} cols`;
          keyLenHint.textContent = `Length: ${state.cleanKeyword.length} letters`;
        } else {
          gridDimensionsBadge.textContent = `Grid: 0 rows Ã— 0 cols`;
          keyLenHint.textContent = `Length: 0 letters`;
        }
      }

      function renderKeyRankRibbon() {
        keyRankRibbon.innerHTML = '';
        if (!state.cleanKeyword) {
          keyRankRibbon.innerHTML = '<span style="font-size:0.75rem; color:var(--text-dim);">Enter a keyword above</span>';
          return;
        }

        for (let i = 0; i < state.cleanKeyword.length; i++) {
          const ch = state.cleanKeyword[i];
          const rank = state.ranks[i];
          const color = getColColor(rank);

          const item = document.createElement('div');
          item.className = 'key-rank-item';
          item.style.borderColor = color;

          const charSpan = document.createElement('span');
          charSpan.className = 'char';
          charSpan.textContent = ch;

          const rankSpan = document.createElement('span');
          rankSpan.className = 'rank-pill';
          rankSpan.style.backgroundColor = color;
          rankSpan.textContent = `#${rank}`;

          item.appendChild(charSpan);
          item.appendChild(rankSpan);
          keyRankRibbon.appendChild(item);
        }
      }

      function renderEmptyState() {
        gridContainer.innerHTML = `
          <div class="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:0.75rem; opacity:0.6;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line></svg>
            <p>Please enter a message and keyword with at least one letter to generate the transposition matrix.</p>
          </div>
        `;
        outputDisplay.innerHTML = '<span style="color:var(--text-dim); font-size:0.9rem;">Waiting for valid input...</span>';
        stepExplanation.textContent = 'Please enter a message and keyword to begin simulation.';
        stepCounterBadge.textContent = 'Step 0 / 0';
        stepProgressFill.style.width = '0%';
        matrixStateTag.textContent = 'AWAITING INPUT';
      }

      function renderMatrix() {
        if (state.totalCols === 0 || state.totalRows === 0) {
          renderEmptyState();
          return;
        }

        const K = state.totalCols;
        const R = state.totalRows;

        // Active column index during current animation step
        const activeStepRank = state.currentStep >= 1 && state.currentStep <= K ? state.currentStep : null;
        const activeColIdx = activeStepRank ? state.rankToCol[activeStepRank - 1] : null;

        // In Decrypt mode, columns with rank <= state.currentStep have been placed
        // In Encrypt mode, all cells are inscribed from step 0, but columns with rank <= state.currentStep have been read

        let html = '<table class="matrix-table" role="grid" aria-label="Transposition grid">';
        
        // 1. Keyword & Rank Header Row
        html += '<thead><tr><th class="row-index-cell" title="Row Index">Row</th>';
        for (let c = 0; c < K; c++) {
          const letter = state.cleanKeyword[c];
          const rank = state.ranks[c];
          const colColor = getColColor(rank);

          const isColActive = activeColIdx === c;
          const isColProcessed = state.currentStep >= rank;

          let colClass = 'key-cell';
          if (isColActive) colClass += ' col-active-header';
          else if (isColProcessed) colClass += ' col-processed-header';

          const activeStyle = isColActive 
            ? `background-color: color-mix(in srgb, ${colColor} 22%, var(--bg-surface)); border-bottom: 3px solid ${colColor};`
            : (isColProcessed ? `background-color: color-mix(in srgb, ${colColor} 8%, var(--bg-surface));` : '');

          html += `
            <th class="${colClass}" style="${activeStyle}">
              <span class="key-letter">${letter}</span>
              <span class="rank-indicator" style="background-color: ${colColor};">#${rank}</span>
              <span class="dir-arrow" title="Read order ${rank}">â†“</span>
            </th>
          `;
        }
        html += '</tr></thead>';

        // 2. Data Rows
        html += '<tbody>';
        for (let r = 0; r < R; r++) {
          html += `<tr><td class="row-index-cell">${r + 1}</td>`;

          for (let c = 0; c < K; c++) {
            const rank = state.ranks[c];
            const colColor = getColColor(rank);
            const isColActive = activeColIdx === c;
            const isColProcessed = state.currentStep >= rank;

            const cell = state.grid[r][c];

            // Determine if cell letter should be visible in Decrypt mode
            let cellContent = '';
            let cellClass = 'data-cell';
            let cellStyle = '';

            if (state.mode === 'decrypt') {
              // In Decrypt mode, only show characters for columns that have been processed up to currentStep
              if (cell !== null && isColProcessed) {
                cellContent = cell.char;
                cellStyle = `color: ${colColor}; background-color: color-mix(in srgb, ${colColor} 6%, var(--bg-surface));`;
              } else if (cell !== null) {
                // Placed column position exists, but waiting for step
                cellContent = '<span style="opacity:0.25; font-size:0.9rem;">Â·</span>';
              } else {
                cellClass += ' cell-empty';
              }
            } else {
              // In Encrypt mode, message is present from step 0
              if (cell !== null) {
                if (cell.isPad) {
                  cellContent = `<span class="cell-pad-char">${cell.char}</span><span class="cell-pad-badge">pad</span>`;
                } else {
                  cellContent = cell.char;
                }

                if (isColProcessed) {
                  cellStyle = `color: ${colColor}; background-color: color-mix(in srgb, ${colColor} 10%, var(--bg-surface));`;
                }
              } else {
                cellClass += ' cell-empty';
              }
            }

            if (isColActive && cell !== null) {
              cellClass += ' col-active-cell';
              cellStyle += ` outline: 2px solid ${colColor}; outline-offset: -2px; font-weight: 900;`;
            }

            html += `
              <td class="${cellClass}" style="${cellStyle}">
                <span class="cell-coord">R${r+1}C${c+1}</span>
                ${cellContent}
              </td>
            `;
          }
          html += '</tr>';
        }
        html += '</tbody></table>';

        gridContainer.innerHTML = html;
      }

      function updateStepUI() {
        const K = state.totalCols;
        if (K === 0) return;

        stepCounterBadge.textContent = `Step ${state.currentStep} / ${K}`;
        const pct = Math.round((state.currentStep / K) * 100);
        stepProgressFill.style.width = `${pct}%`;

        // Update Button States
        prevBtn.disabled = state.currentStep === 0;
        nextBtn.disabled = state.currentStep === K;

        if (state.currentStep === K) {
          matrixStateTag.textContent = 'COMPLETE';
          matrixStateTag.style.color = 'var(--c2)';
        } else if (state.currentStep > 0) {
          matrixStateTag.textContent = `PROCESSING COL (RANK ${state.currentStep})`;
          matrixStateTag.style.color = 'var(--accent)';
        } else {
          matrixStateTag.textContent = 'READY';
          matrixStateTag.style.color = 'var(--text-dim)';
        }

        // Generate Step-by-Step Clear Explanation
        if (state.currentStep === 0) {
          if (state.mode === 'encrypt') {
            stepExplanation.textContent = `Plaintext written row-by-row into the ${state.totalRows} Ã— ${state.totalCols} grid. Ready to read columns out in alphabetical rank order (1 to ${K}).`;
          } else {
            stepExplanation.textContent = `Ciphertext loaded (${state.cleanMessage.length} letters). Ready to calculate column heights, slice pieces in rank order, and reconstruct grid.`;
          }
        } else if (state.currentStep >= 1 && state.currentStep <= K) {
          const s = state.currentStep;
          const colIdx = state.rankToCol[s - 1];
          const letter = state.cleanKeyword[colIdx];
          const chunkObj = state.chunks[s - 1];
          const chunkStr = chunkObj ? chunkObj.text : '';

          if (state.mode === 'encrypt') {
            stepExplanation.innerHTML = `
              <strong>Step ${s} of ${K}:</strong> Reading Column ${colIdx + 1} (Letter '<strong>${letter}</strong>', Rank <strong>#${s}</strong>) top-to-bottom. 
              Extracted chunk: <span style="font-family:var(--font-mono); color:${getColColor(s)}; font-weight:800;">[ ${chunkStr.split('').join(' ')} ]</span> &rarr; Appended to ciphertext.
            `;
          } else {
            stepExplanation.innerHTML = `
              <strong>Step ${s} of ${K}:</strong> Slicing chunk of ${chunkStr.length} letters <span style="font-family:var(--font-mono); color:${getColColor(s)}; font-weight:800;">[ ${chunkStr.split('').join(' ')} ]</span> from ciphertext &rarr; Placed vertically into Column ${colIdx + 1} ('<strong>${letter}</strong>', Rank <strong>#${s}</strong>).
            `;
          }
        } else {
          // Final state
          if (state.mode === 'encrypt') {
            stepExplanation.innerHTML = `<strong>Complete!</strong> All ${K} columns read out in alphabetical rank order. Final ciphertext produced (${state.finalOutput.length} letters).`;
          } else {
            stepExplanation.innerHTML = `<strong>Complete!</strong> All ${K} columns placed into the grid. Reading rows horizontally (left-to-right, top-to-bottom) recovers the plaintext message!`;
          }
        }
      }

      function renderOutput() {
        if (!state.cleanMessage || state.totalCols === 0) {
          outputDisplay.innerHTML = '<span style="color:var(--text-dim);">No output yet.</span>';
          return;
        }

        const K = state.totalCols;

        if (state.mode === 'encrypt') {
          // In Encrypt mode: output builds up as chunks are processed
          const chunksToShow = state.chunks.slice(0, state.currentStep);

          if (chunksToShow.length === 0) {
            outputDisplay.innerHTML = '<span style="color:var(--text-dim); font-size:0.95rem;">(Click "Next Column" or "Auto Play" to extract ciphertext chunks)</span>';
            return;
          }

          if (state.outputFormat === 'chunks') {
            outputDisplay.innerHTML = chunksToShow.map(c => {
              const color = getColColor(c.rank);
              const keyLetter = state.cleanKeyword[c.col];
              return `
                <div class="chunk-tag" style="border-color:${color}; color:${color};">
                  <span>${c.text}</span>
                  <span class="chunk-rank-sub">#${c.rank} (${keyLetter})</span>
                </div>
              `;
            }).join('');
          } else if (state.outputFormat === 'blocks5') {
            const rawStr = chunksToShow.map(c => c.text).join('');
            const blocks = rawStr.match(/.{1,5}/g) || [];
            outputDisplay.textContent = blocks.join(' ');
          } else {
            // continuous
            outputDisplay.textContent = chunksToShow.map(c => c.text).join('');
          }

        } else {
          // In Decrypt mode: recovered plaintext builds up
          if (state.currentStep === 0) {
            outputDisplay.innerHTML = '<span style="color:var(--text-dim); font-size:0.95rem;">(Click "Next Column" to place ciphertext strips into the grid)</span>';
            return;
          }

          // Build row-by-row string with placed letters colored, unplaced letters as placeholder dots
          const R = state.totalRows;
          const outputLetters = [];

          for (let r = 0; r < R; r++) {
            for (let c = 0; c < K; c++) {
              const cell = state.grid[r][c];
              if (cell === null) continue;

              const rank = state.ranks[c];
              const isColPlaced = state.currentStep >= rank;
              const color = getColColor(rank);

              if (isColPlaced) {
                outputLetters.push(`<span style="color:${color}; font-weight:800;">${cell.char}</span>`);
              } else {
                outputLetters.push(`<span style="color:var(--text-dim); opacity:0.35;">_</span>`);
              }
            }
          }

          if (state.outputFormat === 'chunks') {
            outputDisplay.innerHTML = outputLetters.join(' ');
          } else if (state.outputFormat === 'blocks5') {
            // Group visible letters
            const formatted = [];
            for (let i = 0; i < outputLetters.length; i++) {
              if (i > 0 && i % 5 === 0) formatted.push('&nbsp;&nbsp;');
              formatted.push(outputLetters[i]);
            }
            outputDisplay.innerHTML = formatted.join('');
          } else {
            outputDisplay.innerHTML = outputLetters.join('');
          }
        }

        // Update Strip Padding button visibility (only in Decrypt mode when all columns placed)
        if (state.mode === 'decrypt' && state.currentStep === state.maxSteps && state.finalOutput) {
          const pad = state.padChar || 'X';
          const matchPad = state.finalOutput.match(new RegExp(`${pad}+$`));
          if (matchPad && matchPad[0].length > 0) {
            stripPadBtn.style.display = 'inline-flex';
            stripPadBtnText.textContent = `Trim ${matchPad[0].length} trailing '${pad}'`;
          } else {
            stripPadBtn.style.display = 'none';
          }
        } else {
          stripPadBtn.style.display = 'none';
        }
      }

      // -------------------------------------------------------------
      // 5. Animation Controls (Next, Prev, Auto Play, Reset)
      // -------------------------------------------------------------
      function stepNext() {
        if (state.currentStep < state.maxSteps) {
          state.currentStep++;
          renderMatrix();
          updateStepUI();
          renderOutput();
        } else {
          stopAutoPlay();
        }
      }

      function stepPrev() {
        if (state.currentStep > 0) {
          state.currentStep--;
          renderMatrix();
          updateStepUI();
          renderOutput();
        }
      }

      function resetAnimation() {
        stopAutoPlay();
        state.currentStep = 0;
        renderMatrix();
        updateStepUI();
        renderOutput();
      }

      function showResult() {
        stopAutoPlay();
        state.currentStep = state.maxSteps;
        renderMatrix();
        updateStepUI();
        renderOutput();
      }

      function toggleAutoPlay() {
        if (state.isPlaying) {
          stopAutoPlay();
        } else {
          startAutoPlay();
        }
      }

      function startAutoPlay() {
        if (state.currentStep >= state.maxSteps) {
          state.currentStep = 0;
        }
        state.isPlaying = true;
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'inline-block';
        playPauseText.textContent = 'Pause';
        playPauseBtn.classList.add('btn-primary');

        state.playTimer = setInterval(() => {
          if (state.currentStep < state.maxSteps) {
            stepNext();
          } else {
            stopAutoPlay();
          }
        }, state.playIntervalMs);
      }

      function stopAutoPlay() {
        state.isPlaying = false;
        clearInterval(state.playTimer);
        state.playTimer = null;
        playIcon.style.display = 'inline-block';
        pauseIcon.style.display = 'none';
        playPauseText.textContent = 'Auto Play';
        playPauseBtn.classList.remove('btn-primary');
      }

      // -------------------------------------------------------------
      // 6. Mode Switch & "Use Result as Input" Round-Trip
      // -------------------------------------------------------------
      function switchMode(newMode) {
        if (state.mode === newMode) return;
        state.mode = newMode;
        stopAutoPlay();

        if (state.mode === 'encrypt') {
          modeEncryptBtn.classList.add('active');
          modeEncryptBtn.setAttribute('aria-selected', 'true');
          modeDecryptBtn.classList.remove('active');
          modeDecryptBtn.setAttribute('aria-selected', 'false');

          messageLabel.textContent = 'Plaintext Message';
          inputSectionHeading.textContent = 'Cipher Parameters & Plaintext Message';
          outputHeading.textContent = 'Ciphertext Output';
          useResultText.textContent = 'Use Result as Decrypt Input';
          matrixHeading.textContent = 'Transposition Matrix (Write Row-by-Row, Read Columns)';
        } else {
          modeDecryptBtn.classList.add('active');
          modeDecryptBtn.setAttribute('aria-selected', 'true');
          modeEncryptBtn.classList.remove('active');
          modeEncryptBtn.setAttribute('aria-selected', 'false');

          messageLabel.textContent = 'Ciphertext to Decrypt';
          inputSectionHeading.textContent = 'Cipher Parameters & Ciphertext Input';
          outputHeading.textContent = 'Recovered Plaintext';
          useResultText.textContent = 'Use Result as Encrypt Input';
          matrixHeading.textContent = 'Transposition Matrix (Reconstruct Columns, Read Rows)';
        }

        state.currentStep = 0;
        computeCipherData();
      }

      function handleUseResultAsInput() {
        if (!state.finalOutput) {
          showToast('No output to use as input.');
          return;
        }

        const targetResult = state.finalOutput;
        const targetMode = state.mode === 'encrypt' ? 'decrypt' : 'encrypt';

        messageInput.value = targetResult;
        switchMode(targetMode);
        showResult(); // Instantly show decrypted/encrypted result so student sees match!

        showToast(`Switched to ${targetMode.toUpperCase()} mode with result as input!`);
      }

      // -------------------------------------------------------------
      // 7. Educational Frequency & IoC Inspector
      // -------------------------------------------------------------
      function renderFrequencyChart() {
        const text = state.cleanMessage || '';
        const counts = {};
        for (let i = 65; i <= 90; i++) {
          counts[String.fromCharCode(i)] = 0;
        }

        let maxCount = 0;
        for (const ch of text) {
          if (counts[ch] !== undefined) {
            counts[ch]++;
            if (counts[ch] > maxCount) maxCount = counts[ch];
          }
        }

        maxFreqCount.textContent = maxCount;

        // Calculate Index of Coincidence: IC = sum(f_i * (f_i - 1)) / (N * (N - 1))
        const N = text.length;
        let ic = 0;
        if (N > 1) {
          let sumProduct = 0;
          for (const ch in counts) {
            const f = counts[ch];
            sumProduct += f * (f - 1);
          }
          ic = sumProduct / (N * (N - 1));
        }

        const icFormatted = ic.toFixed(4);
        iocDisplay.innerHTML = `Index of Coincidence (IoC): <strong>${icFormatted}</strong> (English Plaintext is ~0.067, Random is ~0.038)`;

        // Calculate factors of length
        const factors = [];
        for (let i = 1; i <= N; i++) {
          if (N % i === 0) factors.push(i);
        }
        factorsDisplay.innerHTML = `Ciphertext Length (${N}) Factors: <strong>${factors.join(', ') || 'None'}</strong>`;

        // Render bars
        freqBarsContainer.innerHTML = '';
        for (let i = 65; i <= 90; i++) {
          const letter = String.fromCharCode(i);
          const count = counts[letter];
          const heightPct = maxCount > 0 ? (count / maxCount) * 100 : 0;

          const col = document.createElement('div');
          col.className = 'freq-bar-col';
          col.title = `${letter}: ${count} occurrences (${((count / (N || 1)) * 100).toFixed(1)}%)`;

          const bar = document.createElement('div');
          bar.className = 'freq-bar-fill';
          bar.style.height = `${Math.max(heightPct, 2)}%`;
          if (count > 0) {
            bar.style.backgroundColor = 'var(--accent)';
          } else {
            bar.style.backgroundColor = 'var(--border-color)';
          }

          const lbl = document.createElement('span');
          lbl.className = 'freq-bar-label';
          lbl.textContent = letter;

          col.appendChild(bar);
          col.appendChild(lbl);
          freqBarsContainer.appendChild(col);
        }
      }

      // -------------------------------------------------------------
      // 8. Clipboard & Toast Notifications
      // -------------------------------------------------------------
      function showToast(message) {
        toastMsg.textContent = message;
        toastNotice.classList.add('show');
        clearTimeout(toastNotice._timer);
        toastNotice._timer = setTimeout(() => {
          toastNotice.classList.remove('show');
        }, 2400);
      }

      function copyOutputToClipboard() {
        if (!state.finalOutput) {
          showToast('Nothing to copy.');
          return;
        }

        let textToCopy = state.finalOutput;
        if (state.outputFormat === 'blocks5') {
          const blocks = textToCopy.match(/.{1,5}/g) || [];
          textToCopy = blocks.join(' ');
        }

        navigator.clipboard.writeText(textToCopy).then(() => {
          showToast('Output copied to clipboard!');
        }).catch(() => {
          // Fallback
          const ta = document.createElement('textarea');
          ta.value = textToCopy;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          showToast('Output copied to clipboard!');
        });
      }

      // -------------------------------------------------------------
      // 9. Presets Loader
      // -------------------------------------------------------------
      function loadPreset(msg, key, pad) {
        stopAutoPlay();
        switchMode('encrypt');
        messageInput.value = msg;
        keywordInput.value = key;
        padCheckbox.checked = pad;
        state.currentStep = 0;
        computeCipherData();
        showToast(`Loaded preset: ${key}`);
      }

      // -------------------------------------------------------------
      // 10. Event Listeners Initialization
      // -------------------------------------------------------------
      function initEventListeners() {
        // Message & Keyword input updates
        messageInput.addEventListener('input', () => {
          stopAutoPlay();
          computeCipherData();
        });

        keywordInput.addEventListener('input', () => {
          stopAutoPlay();
          computeCipherData();
        });

        padCheckbox.addEventListener('change', () => {
          stopAutoPlay();
          computeCipherData();
        });

        padCharInput.addEventListener('input', () => {
          stopAutoPlay();
          computeCipherData();
        });

        // Mode toggling
        modeEncryptBtn.addEventListener('click', () => switchMode('encrypt'));
        modeDecryptBtn.addEventListener('click', () => switchMode('decrypt'));

        // Playback buttons
        resetBtn.addEventListener('click', resetAnimation);
        prevBtn.addEventListener('click', stepPrev);
        nextBtn.addEventListener('click', stepNext);
        playPauseBtn.addEventListener('click', toggleAutoPlay);
        showResultBtn.addEventListener('click', showResult);

        // Speed slider
        speedSlider.addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10);
          // Invert: higher slider = faster (lower interval)
          state.playIntervalMs = 2000 - val;
          speedDisplay.textContent = `${(state.playIntervalMs / 1000).toFixed(1)}s`;
          if (state.isPlaying) {
            clearInterval(state.playTimer);
            state.playTimer = setInterval(() => {
              if (state.currentStep < state.maxSteps) {
                stepNext();
              } else {
                stopAutoPlay();
              }
            }, state.playIntervalMs);
          }
        });

        // Output format buttons
        fmtChunksBtn.addEventListener('click', () => {
          state.outputFormat = 'chunks';
          fmtChunksBtn.classList.add('active');
          fmtFiveBtn.classList.remove('active');
          fmtContinuousBtn.classList.remove('active');
          renderOutput();
        });

        fmtFiveBtn.addEventListener('click', () => {
          state.outputFormat = 'blocks5';
          fmtFiveBtn.classList.add('active');
          fmtChunksBtn.classList.remove('active');
          fmtContinuousBtn.classList.remove('active');
          renderOutput();
        });

        fmtContinuousBtn.addEventListener('click', () => {
          state.outputFormat = 'continuous';
          fmtContinuousBtn.classList.add('active');
          fmtChunksBtn.classList.remove('active');
          fmtFiveBtn.classList.remove('active');
          renderOutput();
        });

        // Copy button
        copyOutputBtn.addEventListener('click', copyOutputToClipboard);

        // Strip Padding button
        stripPadBtn.addEventListener('click', () => {
          const pad = state.padChar || 'X';
          const matchPad = state.finalOutput.match(new RegExp(`${pad}+$`));
          if (matchPad && matchPad[0].length > 0) {
            state.finalOutput = state.finalOutput.slice(0, -matchPad[0].length);
            stripPadBtn.style.display = 'none';
            renderOutput();
            showToast(`Trimmed ${matchPad[0].length} trailing '${pad}' from recovered plaintext`);
          }
        });

        // Use Result as Input (Round-Trip)
        useResultBtn.addEventListener('click', handleUseResultAsInput);

        // Presets
        presetDefault.addEventListener('click', () => {
          loadPreset('WE ARE DISCOVERED FLEE AT ONCE', 'ZEBRAS', false);
        });

        presetTies.addEventListener('click', () => {
          loadPreset('ATTACK POSTPONED UNTIL TOMORROW', 'BANANA', false);
        });

        presetPadded.addEventListener('click', () => {
          loadPreset('FLEE AT ONCE WE ARE DISCOVERED', 'CIPHER', true);
        });

        presetWWII.addEventListener('click', () => {
          loadPreset('DEFEND THE EAST WALL OF THE CASTLE', 'GERMAN', false);
        });

        // Educational Tabs
        eduTabBtns.forEach(btn => {
          btn.addEventListener('click', () => {
            eduTabBtns.forEach(b => b.classList.remove('active'));
            eduPanes.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            const targetPane = document.getElementById(targetId);
            if (targetPane) targetPane.classList.add('active');
          });
        });

        // Keyboard Shortcuts for Accessibility & Interactive Demos
        window.addEventListener('keydown', (e) => {
          // Don't intercept when user is typing inside input or textarea
          const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
          if (activeTag === 'input' || activeTag === 'textarea') return;

          if (e.key === ' ' || e.code === 'Space') {
            e.preventDefault();
            toggleAutoPlay();
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            stepNext();
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            stepPrev();
          } else if (e.key === 'r' || e.key === 'R') {
            e.preventDefault();
            resetAnimation();
          }
        });
      }

      // -------------------------------------------------------------
      // Initial Startup
      // -------------------------------------------------------------
      initTheme();
      initEventListeners();
      computeCipherData();

    })();