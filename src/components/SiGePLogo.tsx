import React from 'react';

export default function SiGePLogo({ className = "", size = 64 }: { className?: string; size?: number }) {
  return (
    <svg
      id="sigep-vector-logo"
      width={size}
      height={size}
      viewBox="0 0 500 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Circle outline with laurel branch patterns */}
      {/* Left wreath branch */}
      <path
        d="M 250,420 C 180,410 110,340 100,250 C 95,200 110,140 150,110"
        stroke="#0F2F57"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* Right wreath branch */}
      <path
        d="M 250,420 C 320,410 390,340 400,250 C 405,200 390,140 350,110"
        stroke="#0F2F57"
        strokeWidth="6"
        strokeLinecap="round"
      />
      
      {/* Wreath Leaves - Left side */}
      <path d="M 102,250 C 80,240 70,220 80,200 C 95,210 100,230 102,250 Z" fill="#0F2F57" />
      <path d="M 100,290 C 75,285 65,265 73,245 C 88,255 95,275 100,290 Z" fill="#0F2F57" />
      <path d="M 108,330 C 85,335 72,315 78,295 C 93,300 103,315 108,330 Z" fill="#0F2F57" />
      <path d="M 125,370 C 100,380 85,365 90,345 C 105,345 118,355 125,370 Z" fill="#0F2F57" />
      <path d="M 152,400 C 130,415 112,405 114,385 C 128,380 142,388 152,400 Z" fill="#0F2F57" />
      <path d="M 190,422 C 170,442 150,435 150,415 C 164,408 180,412 190,422 Z" fill="#0F2F57" />
      {/* Upper left leaves */}
      <path d="M 112,210 C 92,195 85,175 97,158 C 110,170 113,190 112,210 Z" fill="#0F2F57" />
      <path d="M 128,170 C 112,150 108,130 122,115 C 132,130 132,150 128,170 Z" fill="#0F2F57" />
      <path d="M 152,135 C 140,112 140,92 156,80 C 164,95 160,118 152,135 Z" fill="#0F2F57" />
      
      {/* Wreath Leaves - Right side */}
      <path d="M 398,250 C 420,240 430,220 420,200 C 405,210 400,230 398,250 Z" fill="#0F2F57" />
      <path d="M 400,290 C 425,285 435,265 427,245 C 412,255 405,275 400,290 Z" fill="#0F2F57" />
      <path d="M 392,330 C 415,335 428,315 422,295 C 407,300 397,315 392,330 Z" fill="#0F2F57" />
      <path d="M 375,370 C 400,380 415,365 410,345 C 395,345 382,355 375,370 Z" fill="#0F2F57" />
      <path d="M 348,400 C 370,415 388,405 386,385 C 372,380 358,388 348,400 Z" fill="#0F2F57" />
      <path d="M 310,422 C 330,442 350,435 350,415 C 336,408 320,412 310,422 Z" fill="#0F2F57" />
      {/* Upper right leaves */}
      <path d="M 388,210 C 408,195 415,175 403,158 C 390,170 387,190 388,210 Z" fill="#0F2F57" />
      <path d="M 372,170 C 388,150 392,130 378,115 C 368,130 368,150 372,170 Z" fill="#0F2F57" />
      <path d="M 348,135 C 360,112 360,92 344,80 C 336,95 340,118 348,135 Z" fill="#0F2F57" />

      {/* Ribbon bow at bottom crossover */}
      <path d="M 235,415 L 210,440 L 225,445 L 250,425 L 275,445 L 290,440 L 265,415 Z" fill="#0F2F57" />

      {/* Open Book in the Upper Middle */}
      {/* Left Page (Yellow) */}
      <path
        d="M 245,183 C 220,165 190,168 190,168 L 190,103 C 190,103 220,100 245,118 Z"
        fill="#E5A823"
        stroke="#0F2F57"
        strokeWidth="10"
        strokeLinejoin="round"
      />
      {/* Right Page (Yellow) */}
      <path
        d="M 255,183 C 280,165 310,168 310,168 L 310,103 C 310,103 280,100 255,118 Z"
        fill="#E5A823"
        stroke="#0F2F57"
        strokeWidth="10"
        strokeLinejoin="round"
      />
      {/* Central binding shadow */}
      <line x1="250" y1="114" x2="250" y2="185" stroke="#0F2F57" strokeWidth="8" />

      {/* Main Text: SiGeP */}
      <text
        x="250"
        y="270"
        textAnchor="middle"
        fill="#0F2F57"
        fontSize="68"
        fontWeight="900"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        letterSpacing="-1"
      >
        SiGeP
      </text>

      {/* Subtitle Line 1: Sistema de Gestão */}
      <text
        x="250"
        y="312"
        textAnchor="middle"
        fill="#0F2F57"
        fontSize="24"
        fontWeight="800"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        letterSpacing="0.5"
      >
        Sistema de Gestão
      </text>

      {/* Subtitle Line 2: Escolar */}
      <text
        x="250"
        y="346"
        textAnchor="middle"
        fill="#0F2F57"
        fontSize="24"
        fontWeight="800"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        letterSpacing="1"
      >
        Escolar
      </text>
    </svg>
  );
}
