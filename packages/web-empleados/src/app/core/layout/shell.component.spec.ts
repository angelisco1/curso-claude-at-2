import { TestBed } from '@angular/core/testing';
import { importProvidersFrom, signal, computed } from '@angular/core';
import { provideRouter } from '@angular/router';
import { LucideAngularModule, Flame, Beer, Armchair, LayoutGrid, LogOut, AlertCircle } from 'lucide-angular';
import { AuthService, AuthStore } from '@resttek/web-shared';
import { ShellComponent } from './shell.component';

describe('ShellComponent', () => {
  const render = async (role: string) => {
    const user = signal({ firstName: 'Ana', lastName: 'López', role, restaurantId: 'rest-1' });
    TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        provideRouter([]),
        importProvidersFrom(LucideAngularModule.pick({ Flame, Beer, Armchair, LayoutGrid, LogOut, AlertCircle })),
        { provide: AuthStore, useValue: { user, userRole: computed(() => user().role) } },
        { provide: AuthService, useValue: { logout: vi.fn() } }
      ]
    });
    const fixture = TestBed.createComponent(ShellComponent);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  it.each(['manager', 'camarero', 'cocinero'])('shows the Mesas link to %s', async role => {
    const element = await render(role);

    const link = element.querySelector('a[href="/mesas"]');
    expect(link?.textContent).toContain('Mesas');
  });

  it('hides the Mesas link to other roles', async () => {
    const element = await render('cliente');

    expect(element.querySelector('a[href="/mesas"]')).toBeNull();
  });
});
