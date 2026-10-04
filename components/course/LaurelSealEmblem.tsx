import React from "react"

interface LaurelSealEmblemProps {
  className?: string
}

export function LaurelSealEmblem({ className = "" }: LaurelSealEmblemProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer scalloped/serrated ring (36 teeth) */}
      <path
        d="M100 8 
           L107 14 L116 11 L121 19 L130 19 L133 28 L142 30 L143 40 L152 44 L151 54 L159 60 L156 70 L163 78 L158 87 L163 96 L157 104 L160 114 L152 121 L154 131 L144 137 L144 147 L133 151 L131 161 L120 163 L116 172 L105 172 L99 180 L93 172 L82 172 L78 163 L67 161 L65 151 L54 147 L54 137 L44 131 L46 121 L38 114 L41 104 L35 96 L40 87 L35 78 L42 70 L39 60 L47 54 L46 44 L55 40 L56 30 L65 28 L68 19 L77 19 L82 11 L91 14 Z"
        opacity="0.3"
      />

      {/* Outer concentric stroke ring */}
      <circle
        cx="100"
        cy="100"
        r="78"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="3 3"
        opacity="0.5"
      />

      {/* Middle ring */}
      <circle
        cx="100"
        cy="100"
        r="70"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.6"
      />

      {/* Inner dotted ring */}
      <circle
        cx="100"
        cy="100"
        r="54"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="2 3"
        opacity="0.4"
      />

      {/* Stars on left and right */}
      {/* Left Star */}
      <path
        d="M48 97 L51 92 L53 97 L58 97 L54 100 L55 105 L51 102 L47 105 L48 100 L44 97 Z"
        opacity="0.75"
      />
      {/* Right Star */}
      <path
        d="M152 97 L155 92 L157 97 L162 97 L158 100 L159 105 L155 102 L151 105 L152 100 L148 97 Z"
        opacity="0.75"
      />

      {/* Left Laurel Wreath Leaves */}
      <g opacity="0.65">
        <path d="M72 135 C66 122 64 108 66 94 C68 80 74 67 84 57 C85 64 82 72 78 80 C74 92 74 108 80 120 Z" />
        <ellipse cx="68" cy="74" rx="4.5" ry="9" transform="rotate(-35 68 74)" />
        <ellipse cx="63" cy="88" rx="4.5" ry="9" transform="rotate(-20 63 88)" />
        <ellipse cx="62" cy="104" rx="4.5" ry="9" transform="rotate(-5 62 104)" />
        <ellipse cx="64" cy="120" rx="4.5" ry="9" transform="rotate(15 64 120)" />
        <ellipse cx="71" cy="134" rx="4.5" ry="9" transform="rotate(35 71 134)" />
        {/* Secondary inner leaf pairs */}
        <ellipse cx="73" cy="80" rx="3.5" ry="7" transform="rotate(-15 73 80)" />
        <ellipse cx="71" cy="96" rx="3.5" ry="7" transform="rotate(0 71 96)" />
        <ellipse cx="73" cy="112" rx="3.5" ry="7" transform="rotate(15 73 112)" />
      </g>

      {/* Right Laurel Wreath Leaves */}
      <g opacity="0.65">
        <path d="M128 135 C134 122 136 108 134 94 C132 80 126 67 116 57 C115 64 118 72 122 80 C126 92 126 108 120 120 Z" />
        <ellipse cx="132" cy="74" rx="4.5" ry="9" transform="rotate(35 132 74)" />
        <ellipse cx="137" cy="88" rx="4.5" ry="9" transform="rotate(20 137 88)" />
        <ellipse cx="138" cy="104" rx="4.5" ry="9" transform="rotate(5 138 104)" />
        <ellipse cx="136" cy="120" rx="4.5" ry="9" transform="rotate(-15 136 120)" />
        <ellipse cx="129" cy="134" rx="4.5" ry="9" transform="rotate(-35 129 134)" />
        {/* Secondary inner leaf pairs */}
        <ellipse cx="127" cy="80" rx="3.5" ry="7" transform="rotate(15 127 80)" />
        <ellipse cx="129" cy="96" rx="3.5" ry="7" transform="rotate(0 129 96)" />
        <ellipse cx="127" cy="112" rx="3.5" ry="7" transform="rotate(-15 127 112)" />
      </g>

      {/* Decorative top bow / crown leaves */}
      <g opacity="0.6">
        <ellipse cx="94" cy="53" rx="3" ry="6" transform="rotate(-40 94 53)" />
        <ellipse cx="106" cy="53" rx="3" ry="6" transform="rotate(40 106 53)" />
        <circle cx="100" cy="50" r="2.5" />
      </g>
    </svg>
  )
}
