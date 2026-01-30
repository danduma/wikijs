/* THEME SPECIFIC JAVASCRIPT */

(function() {
  'use strict';

  /**
   * Fold Section Enhancements (Animations)
   */
  let foldsDelegated = false

  const animateFoldToggle = (details, content) => {
    if (!details || !content) return

    if (details.open) {
      // CLOSING ANIMATION
      const startHeight = content.offsetHeight
      content.style.height = `${startHeight}px`
      content.style.marginTop = '0.75rem'
      content.style.opacity = '1'

      // Force reflow to register the start state
      void content.offsetWidth

      requestAnimationFrame(() => {
        content.style.height = '0px'
        content.style.marginTop = '0px'
        content.style.opacity = '0'
      })

      const onEnd = () => {
        if (content.style.height === '0px') {
          details.open = false
          content.style.height = ''
          content.style.marginTop = ''
          content.style.opacity = ''
        }
        content.removeEventListener('transitionend', onEnd)
      }
      content.addEventListener('transitionend', onEnd, { once: true })
    } else {
      // OPENING ANIMATION
      details.open = true

      const targetHeight = content.scrollHeight

      content.style.height = '0px'
      content.style.marginTop = '0px'
      content.style.opacity = '0'

      // Force reflow to register the start state
      void content.offsetWidth

      requestAnimationFrame(() => {
        content.style.height = `${targetHeight}px`
        content.style.marginTop = '0.75rem'
        content.style.opacity = '1'
      })

      const onEnd = () => {
        if (content.style.height !== '0px') {
          content.style.height = ''
          content.style.marginTop = ''
          content.style.opacity = ''
        }
        content.removeEventListener('transitionend', onEnd)
      }
      content.addEventListener('transitionend', onEnd, { once: true })
    }
  }

  function initFolds() {
    if (foldsDelegated) return
    foldsDelegated = true

    const getFoldElements = (target) => {
      const summary = target.closest('summary.fold-summary')
      if (!summary) return null
      const details = summary.closest('details.fold')
      if (!details) return null
      const content = details.querySelector('.fold-content')
      if (!content) return null
      return { summary, details, content }
    }

    document.addEventListener('click', (e) => {
      const foldEls = getFoldElements(e.target)
      if (!foldEls) return
      e.preventDefault()
      animateFoldToggle(foldEls.details, foldEls.content)
    })

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      const foldEls = getFoldElements(e.target)
      if (!foldEls) return
      e.preventDefault()
      animateFoldToggle(foldEls.details, foldEls.content)
    })
  }

  /**
   * FAQ Section Enhancements
   */
  function initFAQs() {
    const faqSections = document.querySelectorAll('.faq');
    
    faqSections.forEach(faq => {
      const header = faq.querySelector('.faq-header');
      if (!header) return;

      // Check if controls already exist
      if (faq.querySelector('.faq-controls')) return;

      const controls = document.createElement('div');
      controls.className = 'faq-controls';
      
      const expandBtn = document.createElement('button');
      expandBtn.textContent = 'Expand All';
      expandBtn.onclick = () => {
        faq.querySelectorAll('.faq-item').forEach(item => {
           // For bulk open, we can just force it open without animation for performance/simplicity
           // OR triggers the click event.
           // Triggering click might trigger 50 animations at once. 
           // Let's just set open=true.
           item.open = true;
           // Also ensure styles are clean if they were mid-animation
           const content = item.querySelector('.fold-content');
           if (content) {
               content.style.height = '';
               content.style.marginTop = '';
               content.style.opacity = '';
           }
        });
      };

      const collapseBtn = document.createElement('button');
      collapseBtn.textContent = 'Collapse All';
      collapseBtn.onclick = () => {
        faq.querySelectorAll('.faq-item').forEach(item => {
          item.open = false;
        });
      };

      controls.appendChild(expandBtn);
      controls.appendChild(collapseBtn);
      header.appendChild(controls);

      // Keyboard navigation
      const items = faq.querySelectorAll('.faq-item summary');
      items.forEach((summary, index) => {
        summary.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            const next = items[index + 1] || items[0];
            next.focus();
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prev = items[index - 1] || items[items.length - 1];
            prev.focus();
          } else if (e.key === 'Home') {
            e.preventDefault();
            items[0].focus();
          } else if (e.key === 'End') {
            e.preventDefault();
            items[items.length - 1].focus();
          }
        });
      });
    });
  }

  /**
   * Footnote Enhancements
   */
  function initFootnotes() {
    // Highlight footnote destination when clicking a reference
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash;
      if (hash && (hash.startsWith('#fn') || hash.startsWith('#fnref'))) {
        const target = document.querySelector(hash);
        if (target) {
          const refs = target.closest('details.references');
          if (refs) {
            refs.open = true;
          }
          // Remove existing highlights
          document.querySelectorAll('.footnote-highlight').forEach(el => {
            el.classList.remove('footnote-highlight');
          });
          
          // Add highlight to parent if it's a list item
          const highlightEl = target.tagName === 'LI' ? target : target.closest('li') || target;
          highlightEl.classList.add('footnote-highlight');
          
          // Flash effect
          highlightEl.style.transition = 'background-color 0.5s';
          const originalBg = highlightEl.style.backgroundColor;
          highlightEl.style.backgroundColor = 'rgba(243, 102, 20, 0.2)';
          setTimeout(() => {
            highlightEl.style.backgroundColor = originalBg;
          }, 2000);
        }
      }
    });

    if (window.location.hash && (window.location.hash.startsWith('#fn') || window.location.hash.startsWith('#fnref'))) {
      const target = document.querySelector(window.location.hash);
      if (target) {
        const refs = target.closest('details.references');
        if (refs) {
          refs.open = true;
        }
      }
    }
  }

  /**
   * Initialize all enhancements
   */
  function init() {
    initFolds();
    initFAQs();
    initFootnotes();
    
    // Watch for dynamic content changes (Wiki.js specific)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          initFolds();
          initFAQs();
        }
      });
    });

    const contentArea = document.querySelector('.v-main .contents');
    if (contentArea) {
      observer.observe(contentArea, { childList: true, subtree: true });
    }
  }

  // Run on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
