# Phase 12: Accessibility Testing Guide

## Accessibility Standards

### WCAG 2.1 Compliance
- **Target Level**: AA (minimum)
- **Goal**: AAA where possible

### Key Principles
1. **Perceivable** - Information must be presentable to users
2. **Operable** - Interface components must be operable
3. **Understandable** - Information must be understandable
4. **Robust** - Content must be robust enough for assistive technologies

## Testing Tools

### Automated Tools
```bash
# axe-core (browser extension or CLI)
npm install -g @axe-core/cli

# Lighthouse accessibility audit
lighthouse http://localhost:3000 --only-categories=accessibility

# Pa11y (command line)
npm install -g pa11y
pa11y http://localhost:3000
```

### Browser Extensions
- axe DevTools
- WAVE (Web Accessibility Evaluation Tool)
- Lighthouse (Chrome DevTools)

## Accessibility Checklist

### Perceivable

#### Text Alternatives
- [ ] All images have alt text
- [ ] Decorative images have empty alt text
- [ ] Icons have aria-labels
- [ ] Form inputs have labels

#### Color and Contrast
- [ ] Text contrast ratio: 4.5:1 (normal), 3:1 (large)
- [ ] Color is not the only means of conveying information
- [ ] Focus indicators are visible
- [ ] Links are distinguishable

#### Multimedia
- [ ] Videos have captions (if applicable)
- [ ] Audio has transcripts (if applicable)
- [ ] Media controls are accessible

### Operable

#### Keyboard Navigation
- [ ] All functionality available via keyboard
- [ ] Tab order is logical
- [ ] Focus indicators visible
- [ ] No keyboard traps
- [ ] Skip links available

#### Timing
- [ ] No time limits (or adjustable)
- [ ] Auto-updating content can be paused
- [ ] No flashing content (3 flashes per second)

#### Navigation
- [ ] Multiple ways to find content
- [ ] Headings and labels descriptive
- [ ] Focus order logical

### Understandable

#### Readable
- [ ] Language of page declared
- [ ] Unusual words defined
- [ ] Abbreviations explained
- [ ] Reading level appropriate

#### Predictable
- [ ] Navigation consistent
- [ ] Components behave consistently
- [ ] Changes of context are obvious
- [ ] Error messages clear

#### Input Assistance
- [ ] Error identification
- [ ] Error suggestions provided
- [ ] Error prevention (confirmations)
- [ ] Labels and instructions clear

### Robust

#### Compatible
- [ ] Valid HTML
- [ ] Proper ARIA attributes
- [ ] Screen reader compatible
- [ ] Works with assistive technologies

## Mobile Accessibility

### Touch Targets
- [ ] Minimum 44x44px touch targets
- [ ] Adequate spacing between targets
- [ ] Gestures have alternatives

### Screen Reader
- [ ] All content readable by screen reader
- [ ] Proper heading hierarchy
- [ ] Form labels accessible
- [ ] Buttons have accessible names

### Visual
- [ ] Text scalable up to 200%
- [ ] Content reflows properly
- [ ] No horizontal scrolling required

## Testing Checklist

### Automated Testing
- [ ] Run axe-core on all pages
- [ ] Run Lighthouse accessibility audit
- [ ] Run Pa11y on critical pages
- [ ] Fix all critical issues
- [ ] Document moderate issues

### Manual Testing
- [ ] Keyboard navigation test
- [ ] Screen reader test (VoiceOver/NVDA)
- [ ] Color contrast check
- [ ] Focus management test
- [ ] Form accessibility test

### User Testing
- [ ] Test with actual screen reader users
- [ ] Test with keyboard-only users
- [ ] Gather feedback from disabled users

## Common Issues to Fix

### Critical
- Missing alt text on images
- Missing form labels
- Poor color contrast
- Missing focus indicators
- Keyboard traps

### Important
- Missing ARIA labels
- Incorrect heading hierarchy
- Missing skip links
- Poor error messages
- Inaccessible modals

## ARIA Best Practices

- Use semantic HTML first
- Use ARIA only when needed
- Ensure ARIA attributes are correct
- Test with screen readers
- Keep ARIA simple

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM](https://webaim.org/)
- [a11y Project](https://www.a11yproject.com/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)

## Notes

- Accessibility is an ongoing process
- Test early and often
- Involve users with disabilities
- Document accessibility features
- Regular audits recommended
