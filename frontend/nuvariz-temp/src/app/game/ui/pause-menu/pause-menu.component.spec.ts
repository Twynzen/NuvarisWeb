import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { PauseMenuComponent } from './pause-menu.component';

describe('PauseMenuComponent', () => {
  let component: PauseMenuComponent;
  let fixture: ComponentFixture<PauseMenuComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [PauseMenuComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PauseMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
