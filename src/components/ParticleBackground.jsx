import React from "react";
import Particles from "react-tsparticles";
import particlesConfig from "./config/particles.config";

const ParticleBackground = () => {
  return <Particles options={particlesConfig} />;
};

export default ParticleBackground;