import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

const SearchInput = () => {
  // Estado para armazenar o texto que o usuário digita
  const [searchText, setSearchText] = useState('');

  // O texto completo do label
  const labelText = 'Busque um remédio ou insira sua queixa';

  return (
    <View style={styles.container}>
      {/* 1. O Componente Label (Text) */}
      <Text style={styles.label}>{labelText}</Text>

      {/* 2. O Componente Input de Busca (TextInput) */}
      <TextInput
        style={styles.input}
        onChangeText={setSearchText} // Atualiza o estado quando o texto muda
        value={searchText}
        placeholder="Digite sua busca aqui..." // Texto temporário
        placeholderTextColor="#999"
        keyboardType="default" // Tipo de teclado padrão
        autoCapitalize="none" // Evita capitalização automática, se preferir
        // Você pode adicionar um ícone de lupa (search) aqui se estiver usando bibliotecas de ícones
      />
      
      {/* Opcional: Mostrar o texto digitado */}
      <Text style={styles.currentValue}>Valor atual: {searchText}</Text>
    </View>
  );
};

// Estilos
const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginHorizontal: 10,
    marginTop: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    height: 45,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    // Sombra sutil para Android
    elevation: 2, 
    // Sombra sutil para iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  currentValue: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  }
});

export default SearchInput;