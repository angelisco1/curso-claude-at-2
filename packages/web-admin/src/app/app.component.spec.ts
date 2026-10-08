import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { AppComponent } from './app.component'

describe('AppComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([])]
    })
  })

  it('creates the component', () => {
    const fixture = TestBed.createComponent(AppComponent)

    expect(fixture.componentInstance).toBeTruthy()
  })
})
