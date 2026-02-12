const renderer = require('../modules/rendering/html-longevidata/renderer')
const rp = require('request-promise')

jest.mock('request-promise')

describe('LongeviData Renderer', () => {
  const config = {
    apiBaseUrl: 'https://api.example.com',
    apiToken: 'fake-token'
  }

  beforeEach(() => {
    rp.mockClear()
  })

  test('should render static table for valid intervention', async () => {
    const input = '<longevidata-table intervention="123" name="Test Intervention"></longevidata-table>'
    
    // Mock API response
    const mockData = {
      outcomes: [
        {
          vocabulary_term: 'Outcome A',
          grade_rating: 'high',
          study_count: 5,
          total_participants: 100,
          effect_direction: 'positive',
          condition_name: 'Condition X',
          condition_id: 'cx'
        }
      ]
    }
    
    rp.mockResolvedValue(mockData)

    const output = await renderer.init(input, config)

    // Verify output contains expected structure
    expect(output).toContain('class="longevidata-widget-static"')
    expect(output).toContain('Test Intervention')
    expect(output).toContain('Outcome A')
    expect(output).toContain('Condition X')
    
    // Verify API was called with correct params
    expect(rp).toHaveBeenCalledWith(expect.objectContaining({
      uri: 'https://api.example.com/api/research/outcomes?intervention_id=123',
      headers: { 'Authorization': 'Bearer fake-token' }
    }))
  })

  test('should render static table for valid condition', async () => {
    const input = '<longevidata-table condition="456" name="Test Condition"></longevidata-table>'
    
    // Mock API response
    const mockData = {
      outcomes: [
        {
          vocabulary_term: 'Outcome B',
          grade_rating: 'moderate',
          study_count: 3,
          total_participants: 50,
          effect_direction: 'negative',
          intervention_name: 'Intervention Y',
          intervention_id: 'iy'
        }
      ]
    }
    
    rp.mockResolvedValue(mockData)

    const output = await renderer.init(input, config)

    expect(output).toContain('Test Condition')
    expect(output).toContain('Outcome B')
    expect(output).toContain('Intervention Y')
    
    expect(rp).toHaveBeenCalledWith(expect.objectContaining({
      uri: 'https://api.example.com/api/research/outcomes?condition_id=456'
    }))
  })

  test('should render static safety table', async () => {
    const input = '<longevidata-safety intervention="123" name="Berberine Safety"></longevidata-safety>'

    const mockData = [
      {
        signal_type: 'interaction',
        title: 'CYP3A4 substrate interactions',
        summary: 'May increase exposure for sensitive substrates.',
        severity: 'moderate',
        evidence_level: 'moderate',
        reference_url: 'https://pubmed.ncbi.nlm.nih.gov/12345/'
      }
    ]

    rp.mockResolvedValue(mockData)

    const output = await renderer.init(input, config)

    expect(output).toContain('class="longevidata-safety-widget-static"')
    expect(output).toContain('Berberine Safety')
    expect(output).toContain('CYP3A4 substrate interactions')
    expect(rp).toHaveBeenCalledWith(expect.objectContaining({
      uri: 'https://api.example.com/api/research/safety?intervention_id=123'
    }))
  })

  test('should handle API errors gracefully', async () => {
    const input = '<longevidata-table intervention="999" name="Fail Intervention"></longevidata-table>'
    
    rp.mockRejectedValue(new Error('API Error'))

    const output = await renderer.init(input, config)

    expect(output).toContain('longevidata-widget-error')
    expect(output).toContain('Unable to load research data')
  })
  
  test('should ignore input without tags', async () => {
    const input = '<p>Just normal text</p>'
    const output = await renderer.init(input, config)
    expect(output).toBe(input)
    expect(rp).not.toHaveBeenCalled()
  })
})
