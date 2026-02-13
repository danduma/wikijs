const renderer = require('../modules/rendering/html-longevidence-metrics/renderer')

describe('Longevidence Metrics Renderer', () => {
  test('renders compact effect code tags', async () => {
    const input = '<effect e="d2p"></effect>'
    const output = await renderer.init(input)

    expect(output).toContain('class="longevidence-effect longevidence-effect-static longevidence-effect-positive"')
    expect(output).toContain('↓↓')
    expect(output).toContain('Medium Improvement')
    expect(output).toContain('data-initial=')
  })

  test('renders no-effect and unclear compact codes', async () => {
    const noEffectOutput = await renderer.init('<effect e="e0x"></effect>')
    const unclearOutput = await renderer.init('<effect e="q0x"></effect>')

    expect(noEffectOutput).toContain('No effect')
    expect(noEffectOutput).toContain('=')

    expect(unclearOutput).toContain('Unclear')
    expect(unclearOutput).toContain('?')
  })

  test('upgrades plain text table cells into effects', async () => {
    const input = `
      <table class="evidence-table">
        <tbody>
          <tr><td>↓↓ (p)</td></tr>
          <tr><td>= (x)</td></tr>
          <tr><td>?</td></tr>
        </tbody>
      </table>
    `
    const output = await renderer.init(input)

    expect(output).toContain('<effect e="d2p"')
    expect(output).toContain('<effect e="e0x"')
    expect(output).toContain('<effect e="q0x"')
    expect(output).toContain('longevidence-effect-static')
  })

  test('keeps legacy longevidence-effect attributes working', async () => {
    const input = '<longevidence-effect direction="down" magnitude="large" sentiment="negative"></longevidence-effect>'
    const output = await renderer.init(input)

    expect(output).toContain('class="longevidence-effect longevidence-effect-static longevidence-effect-negative"')
    expect(output).toContain('Large Worsening')
  })
})
