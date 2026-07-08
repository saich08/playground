(function (root) {
  const QC = (root.QC = root.QC || {});

  class Complex {
    constructor(re = 0, im = 0) {
      this.re = re;
      this.im = im;
    }

    add(o) {
      return new Complex(this.re + o.re, this.im + o.im);
    }

    sub(o) {
      return new Complex(this.re - o.re, this.im - o.im);
    }

    mul(o) {
      return new Complex(
        this.re * o.re - this.im * o.im,
        this.re * o.im + this.im * o.re
      );
    }

    scale(k) {
      return new Complex(this.re * k, this.im * k);
    }

    conj() {
      return new Complex(this.re, -this.im);
    }

    abs2() {
      return this.re * this.re + this.im * this.im;
    }

    abs() {
      return Math.sqrt(this.abs2());
    }

    phase() {
      return Math.atan2(this.im, this.re);
    }

    isNegligible(eps = 1e-9) {
      return this.abs2() < eps * eps;
    }

    toString(p = 3) {
      const re = Math.abs(this.re) < 1e-9 ? 0 : this.re;
      const im = Math.abs(this.im) < 1e-9 ? 0 : this.im;
      if (im === 0) return re.toFixed(p);
      if (re === 0) return `${im.toFixed(p)}i`;
      const sign = im < 0 ? '-' : '+';
      return `${re.toFixed(p)} ${sign} ${Math.abs(im).toFixed(p)}i`;
    }
  }

  QC.Complex = Complex;
})(typeof window !== 'undefined' ? window : global);
