/**
 * Mock Voice engine for testing and browser environments without microphone.
 */

export class MockVoiceSession {
  constructor({ onEvent, onStateChange }) {
    this.onEvent = onEvent
    this.onStateChange = onStateChange
    this.turnCount = 0
  }

  simulateTurn(transcriptText = 'Ramesh Sharma ka 340 udhaar') {
    const turnId = `mock-turn-${++this.turnCount}`

    if (this.onStateChange) this.onStateChange('listening')

    setTimeout(() => {
      if (this.onStateChange) this.onStateChange('understanding')
      if (this.onEvent) {
        this.onEvent({
          type: 'heard',
          turn_id: turnId,
          text: transcriptText,
          language: 'hi',
        })
      }

      setTimeout(() => {
        if (transcriptText.includes('Ramesh ka total')) {
          if (this.onStateChange) this.onStateChange('asking')
          if (this.onEvent) {
            this.onEvent({
              type: 'question',
              turn_id: turnId,
              kind: 'choose_customer',
              say: 'Kaun se? Ramesh Sharma ya Ramesh Gupta?',
              options: [
                { id: '1', label: 'Ramesh Sharma (Gandhi Nagar)' },
                { id: '2', label: 'Ramesh Gupta (Station Road)' },
              ],
            })
          }
        } else {
          if (this.onStateChange) this.onStateChange('speaking')
          if (this.onEvent) {
            this.onEvent({
              type: 'entry',
              turn_id: turnId,
              entry: {
                id: 100 + this.turnCount,
                customer_id: 1,
                customer_name: 'Ramesh Sharma',
                amount_paise: 34000,
                direction: 'credit',
                business_date: new Date().toISOString().split('T')[0],
                recorded_at: new Date().toISOString(),
                status: 'new',
                old_amount_paise: null,
                language: 'hi',
              },
              balance_paise: 84000,
              new_customer: false,
            })
            this.onEvent({
              type: 'answer',
              turn_id: turnId,
              kind: 'entry_saved',
              say: 'Ramesh Sharma ke khaate me teen sau chaalis rupaye udhaar likh diya. Kul baaki aath sau chaalis.',
              data: { count: 1 },
            })
          }

          setTimeout(() => {
            if (this.onStateChange) this.onStateChange('resting')
          }, 2500)
        }
      }, 700)
    }, 800)
  }

  simulateChoice(turnId, choice) {
    if (this.onStateChange) this.onStateChange('speaking')
    setTimeout(() => {
      if (this.onEvent) {
        this.onEvent({
          type: 'answer',
          turn_id: turnId,
          kind: 'balance',
          say: 'Ramesh Gupta ka kul baaki aath sau rupaye hai.',
          data: { customer_id: 2, customer_name: 'Ramesh Gupta', balance_paise: 80000 },
        })
      }
      setTimeout(() => {
        if (this.onStateChange) this.onStateChange('resting')
      }, 1500)
    }, 500)
  }
}
