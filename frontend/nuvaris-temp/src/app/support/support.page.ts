import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

interface SupportOption {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  price: string;
  priceNote?: string;
  benefits: string[];
  action: string;
  actionType: 'link' | 'email' | 'coming-soon';
  actionUrl?: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-support',
  templateUrl: 'support.page.html',
  styleUrls: ['support.page.scss'],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    RouterModule
  ],
})
export class SupportPage {

  supportOptions: SupportOption[] = [
    {
      id: 'donation',
      title: 'DONACIÓN',
      subtitle: 'Contribuye libremente',
      description: 'Apoya el desarrollo de Nuvaris con la cantidad que desees. Cada contribución nos ayuda a seguir creando.',
      price: 'TÚ ELIGES',
      priceNote: 'Desde $1 USD',
      benefits: [
        'Actualizaciones constantes del juego',
        'Feedback prioritario escuchado',
        'Comunicación directa con el equipo',
        'Nuestro eterno agradecimiento'
      ],
      action: 'DONAR AHORA',
      actionType: 'link',
      actionUrl: 'https://ko-fi.com/nuvaris' // Placeholder - cambiar por URL real
    },
    {
      id: 'character',
      title: 'TU PERSONAJE',
      subtitle: 'Inmortalízate en el juego',
      description: 'Diseñamos un personaje basado en ti o tu idea. Incluye assets, comportamiento, habilidades y tu lugar en el universo de Nuvaris.',
      price: '$100 USD',
      priceNote: 'Pago único',
      benefits: [
        'Diseño completo de assets 2.5D',
        'Sistema de habilidades único',
        'Historia integrada en el lore',
        'Créditos permanentes en el juego'
      ],
      action: 'CONTACTAR',
      actionType: 'email',
      actionUrl: 'mailto:personajes@nuvaris.com?subject=Quiero mi personaje en Nuvaris'
    },
    {
      id: 'currency',
      title: 'MONEDA QDT',
      subtitle: 'Economía del juego',
      description: 'Sistema de moneda virtual para el universo de Nuvaris. Comercia, intercambia y desbloquea contenido exclusivo.',
      price: 'PRÓXIMAMENTE',
      priceNote: 'En desarrollo',
      benefits: [
        'Compra de items cosméticos',
        'Desbloqueo de contenido',
        'Sistema de trading (futuro)',
        'Economía dinámica del juego'
      ],
      action: 'PRÓXIMAMENTE',
      actionType: 'coming-soon',
      disabled: true
    }
  ];

  contactEmail = 'soporte@nuvaris.com'; // Placeholder

  constructor(private router: Router) { }

  goBack() {
    this.router.navigate(['/']);
  }

  onOptionAction(option: SupportOption) {
    if (option.disabled) return;

    if (option.actionType === 'link' && option.actionUrl) {
      window.open(option.actionUrl, '_blank');
    } else if (option.actionType === 'email' && option.actionUrl) {
      window.location.href = option.actionUrl;
    }
  }
}
