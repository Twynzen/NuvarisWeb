import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="home-container">
      <div class="stars"></div>
      <div class="content">
        <h1 class="title">NUVARIS</h1>
        <p class="subtitle">Explore the Universe</p>

        <nav class="navigation">
          <a routerLink="/game" class="nav-card game-card">
            <div class="card-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
              </svg>
            </div>
            <h2>Roguelite Game</h2>
            <p>Vampire Survivors style combat</p>
          </a>

          <a routerLink="/tartarus-prime" class="nav-card tartarus-card">
            <div class="card-icon fire-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                <circle cx="12" cy="12" r="5"/>
              </svg>
            </div>
            <h2>Tartarus Prime</h2>
            <p>Interactive volcanic planet</p>
            <span class="badge">3D Experience</span>
          </a>
        </nav>

        <footer class="footer">
          <p>Use hand gestures to navigate Tartarus Prime</p>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    .home-container {
      width: 100%;
      height: 100vh;
      background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%);
      position: relative;
      overflow: hidden;
    }

    .stars {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image:
        radial-gradient(2px 2px at 20px 30px, white, transparent),
        radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.8), transparent),
        radial-gradient(1px 1px at 90px 40px, white, transparent),
        radial-gradient(2px 2px at 160px 120px, rgba(255,255,255,0.6), transparent),
        radial-gradient(1px 1px at 230px 80px, white, transparent),
        radial-gradient(2px 2px at 300px 150px, rgba(255,255,255,0.7), transparent);
      background-repeat: repeat;
      background-size: 350px 350px;
      animation: twinkle 5s ease-in-out infinite;
    }

    @keyframes twinkle {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    .content {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 2rem;
    }

    .title {
      font-size: 4rem;
      font-weight: 300;
      letter-spacing: 1rem;
      margin-bottom: 0.5rem;
      background: linear-gradient(90deg, #ff4400, #ffaa00, #ff4400);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: shimmer 3s ease-in-out infinite;
    }

    @keyframes shimmer {
      0%, 100% { background-position: 0% center; }
      50% { background-position: 200% center; }
    }

    .subtitle {
      font-size: 1.2rem;
      color: rgba(255, 255, 255, 0.6);
      margin-bottom: 3rem;
      letter-spacing: 0.3rem;
    }

    .navigation {
      display: flex;
      gap: 2rem;
      flex-wrap: wrap;
      justify-content: center;
    }

    .nav-card {
      width: 280px;
      padding: 2rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      text-decoration: none;
      color: white;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .nav-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.05) 100%);
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .nav-card:hover {
      transform: translateY(-8px);
      border-color: rgba(255, 68, 0, 0.5);
      box-shadow: 0 20px 40px rgba(255, 68, 0, 0.2);
    }

    .nav-card:hover::before {
      opacity: 1;
    }

    .card-icon {
      width: 60px;
      height: 60px;
      margin-bottom: 1rem;
      color: rgba(255, 255, 255, 0.7);
    }

    .tartarus-card .card-icon {
      color: #ff4400;
      animation: pulse-glow 2s ease-in-out infinite;
    }

    @keyframes pulse-glow {
      0%, 100% {
        filter: drop-shadow(0 0 5px rgba(255, 68, 0, 0.5));
      }
      50% {
        filter: drop-shadow(0 0 20px rgba(255, 68, 0, 0.8));
      }
    }

    .nav-card h2 {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }

    .nav-card p {
      color: rgba(255, 255, 255, 0.5);
      font-size: 0.9rem;
    }

    .badge {
      display: inline-block;
      margin-top: 1rem;
      padding: 0.3rem 0.8rem;
      background: linear-gradient(90deg, #ff4400, #ff6600);
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05rem;
    }

    .footer {
      position: absolute;
      bottom: 2rem;
      color: rgba(255, 255, 255, 0.4);
      font-size: 0.85rem;
    }

    @media (max-width: 640px) {
      .title {
        font-size: 2.5rem;
        letter-spacing: 0.5rem;
      }

      .nav-card {
        width: 100%;
        max-width: 300px;
      }
    }
  `]
})
export class HomeComponent {}
